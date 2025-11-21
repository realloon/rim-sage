import OpenAI from 'openai'
import pLimit from 'p-limit'
import { llm } from '#helper/config'
import { db } from '#helper/db'

const openai = new OpenAI()
const limit = pLimit(5)

async function main() {
  const nodes = db
    .query(
      `
      SELECT * FROM code_nodes 
      WHERE summary IS NULL 
      ORDER BY weight DESC
      `
    )
    .all() as any[]

  console.log(`📝 待处理节点数: ${nodes.length}`)

  // 准备查询 Calls 名称的 SQL (为了给 LLM 提供上下文)
  const getNameStmt = db.prepare('SELECT name FROM code_nodes WHERE id = ?')

  // 准备更新 SQL
  const updateStmt = db.prepare(
    'UPDATE code_nodes SET summary = $summary WHERE id = $id'
  )

  // 2. 构建任务队列
  const tasks = nodes.map(node => {
    return limit(async () => {
      try {
        // 策略：权重太低直接跳过 LLM，省钱
        if (node.weight < 0.1 && node.code_role === 'DataHolder') {
          console.log(`⏩ 跳过低权重: ${node.name}`)
          updateStmt.run({
            $id: node.id,
            $summary: 'Internal data structure or simple property.',
          })
          return
        }

        // 获取上下文 (解析 calls JSON 拿到 ID，再查 name)
        const callIds = JSON.parse(node.calls || '[]')
        const callNames = callIds
          .map((id: string) => getNameStmt.get(id) as any)
          .filter((r: any) => r)
          .map((r: any) => r.name)

        // 生成 Prompt
        const prompt = buildPrompt(node, callNames)

        // 调用 LLM
        const response = await openai.chat.completions.create({
          model: llm,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        })

        const summary = response.choices[0].message.content?.trim() ?? null

        // 写入数据库
        updateStmt.run({ $id: node.id, $summary: summary })
        console.log(`✅ 已生成: ${node.name} [${node.code_role}]`)
      } catch (error) {
        console.error(`❌ 失败: ${node.name}`, error)
      }
    })
  })

  // 3. 等待所有任务完成
  await Promise.all(tasks)
  console.log('🎉 所有摘要生成完毕！')
}

main()

function buildPrompt(node: any, callNames: string[]) {
  const callsContext =
    callNames.length > 0
      ? `Context: It calls these components: ${callNames.join(', ')}.`
      : ''

  // 通用指令：设定 LLM 为“索引员”而非“老师”
  const basePrompt = `
You are a Technical Indexer for a Semantic Search Engine.
Your job is to write a high-level summary for the C# code node "${node.name}" (${node.type}).
This summary will be converted into a vector embedding for search retrieval.

Code Body:
\`\`\`csharp
${node.code_body}
\`\`\`
${callsContext}

Global Constraints:
1. STRICTLY LIMIT response to 2-3 sentences.
2. DO NOT mention variable names (e.g., "var analysis"), loop constructs (foreach), or specific API methods (e.g., "Translate()", "ToLineList()").
3. DO NOT mention string keys (e.g., "CWF_UI_Confirm...").
4. Focus on the "Business Purpose" (Why it exists), not the "Implementation" (How it runs).
`

  // --- 分支 1: UI 交互层 ---
  if (node.code_role === 'UI') {
    return `${basePrompt}
    
    Specific Instruction for UI Role:
    - Focus on the **User Intent**: What feature does this enable the user to do? (e.g., "Uninstall a part", "Open settings").
    - Mention if it involves **Intervention**: Does it trigger a confirmation dialog or a warning?
    - Ignore the visual layout or text formatting details.
    
    Example Output Format:
    "Provides the [User Action] menu option. It triggers a conflict check and prompts the user to confirm if [Condition] before executing the operation."
    `
  }

  // --- 分支 2: 核心业务逻辑 ---
  if (node.code_role === 'CoreLogic') {
    return `${basePrompt}
    
    Specific Instruction for CoreLogic Role:
    - Focus on the **Responsibility**: What calculation or decision does this drive?
    - Mention the **Strategy**: e.g., "Recursively checks dependencies" or "Filters based on traits".
    - Skip the step-by-step execution flow.

    Example Output Format:
    "Calculates [Result] by evaluating [Inputs]. It enforces rules regarding [Business Concept] to ensure [Goal]."
    `
  }

  // --- 分支 3: 数据/辅助 ---
  // DataHolder / Helper
  return `${basePrompt}
  
  Specific Instruction for Data/Helper Role:
  - Simply state what data entity resides here or what simple transformation it performs.
  - Keep it under 15 words.
  `
}
