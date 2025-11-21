import OpenAI from 'openai'
import { em, vectorDim } from '#helper/config'
import { db } from '#helper/db'

const openai = new OpenAI()

// 2. 创建向量虚拟表
// 注意：我们在 vec0 中只存 embedding，通过 rowid 关联主表
db.run(`
  CREATE VIRTUAL TABLE IF NOT EXISTS code_vectors USING vec0(
    embedding float[${vectorDim}]
  );
`)

console.log('✅ 向量表初始化完成')

// 3. 获取需要向量化的数据
// 我们只处理 summary 已经生成，且还没入库向量的数据
// (这里简化逻辑：简单的差量更新可以通过 rowid 不在 code_vectors 里判断)
const nodesToProcess = db
  .query(
    `
  SELECT rowid, id, name, summary, code_role 
  FROM code_nodes 
  WHERE summary IS NOT NULL
  AND rowid NOT IN (SELECT rowid FROM code_vectors)
`
  )
  .all() as any[]

console.log(`🚀 待处理向量节点: ${nodesToProcess.length} 个`)

if (nodesToProcess.length === 0) {
  console.log('没有新数据需要向量化。')
  process.exit(0)
}

// 4. 批量处理函数 (OpenAI 支持一次发一批，节省网络开销)
const BATCH_SIZE = 20

async function processBatch(batch: any[]) {
  // A. 构建语义文本
  // 技巧：把 Role 和 Name 加进去，增加语义锚点
  const textsToEmbed = batch.map(node => {
    return `[Type: ${node.code_role}] Name: ${node.name}. Summary: ${node.summary}`
  })

  // B. 调用 Embedding API
  const response = await openai.embeddings.create({
    model: em,
    input: textsToEmbed,
    encoding_format: 'float',
    dimensions: vectorDim,
  })

  // C. 写入数据库
  const insertStmt = db.prepare(
    'INSERT INTO code_vectors(rowid, embedding) VALUES (?, ?)'
  )

  db.transaction(() => {
    response.data.forEach((item, index) => {
      const originalNode = batch[index]
      const vector = new Float32Array(item.embedding)
      insertStmt.run(originalNode.rowid, vector)
    })
  })()

  console.log(`✨ 已存入 batch (${batch.length} 条)`)
}

// 5. 执行循环
for (let i = 0; i < nodesToProcess.length; i += BATCH_SIZE) {
  const batch = nodesToProcess.slice(i, i + BATCH_SIZE)
  await processBatch(batch)
}

console.log('🎉 向量化全部完成！')
