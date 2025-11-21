import { SearchResult } from '../../types'
import OpenAI from 'openai'
import { llm } from '../../helper/config'

const openai = new OpenAI()

export async function rankWithLLM(
  query: string,
  candidates: SearchResult[]
): Promise<SearchResult[]> {
  const topCandidates = candidates.slice(0, 10)

  // 2. 构建 Context
  const contextBlock = topCandidates
    .map((c, idx) => {
      const truncatedBody =
        c.code_body.length > 1500
          ? c.code_body.substring(0, 1500) + '\n// [Truncated]'
          : c.code_body

      return `
### Candidate ID: ${idx}
- Name: ${c.name}
- Calls: ${c.calls.slice(0, 3).join(', ') || 'unknow'}
- CalledBy: ${c.called_by.slice(0, 3).join(', ') || 'unknow'}
- FilePath: ${c.file_path}
- Code:
\`\`\`cs
${truncatedBody}
\`\`\`
`.trim()
    })
    .join('\n\n')

  // 3. 构建 Prompt
  const prompt = `
    User Query: "${query}"

    Identify the 3 most relevant code snippets that implement the user's intent.
    - Prefer ACTUAL IMPLEMENTATION (logic) over interfaces or data.
    - Use topology (Called By) to distinguish Entry Points vs Utilities.

    Output JSON:
    {
      "ranked_indices": [0, 1, 2], 
      "reasoning": "Brief explanation..."
    }
    `

  // 4. 调用 LLM
  const resp = await openai.chat.completions.create({
    model: llm,
    messages: [
      { role: 'system', content: 'You are a code reasoning engine.' },
      { role: 'user', content: contextBlock + '\n\n' + prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = JSON.parse(resp.choices[0].message.content || '{}')
  const indices: number[] = content.ranked_indices || []

  // 5. 重组结果
  // 将 LLM 选中的排在最前，保留推理理由
  const reordered: SearchResult[] = []
  const selectedSet = new Set<number>()

  indices.forEach(idx => {
    if (topCandidates[idx]) {
      selectedSet.add(idx)
      reordered.push({
        ...topCandidates[idx],
        reasoning: content.reasoning,
      })
    }
  })

  return reordered
}
