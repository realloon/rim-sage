import type { CodeNode, DbRow } from '../types'
import { db } from '../helper/db'

const UI_KEYWORDS = [
  'Dialog',
  'Window',
  'Menu',
  'FloatMenu',
  'Rect',
  'Listing',
  'Command_Action',
]

function analyzeNode(row: DbRow) {
  const calls: string[] = JSON.parse(row.calls)
  const lines = row.code_body.split('\n').length

  let role: CodeNode['codeRole'] = 'Helper' // default

  if (row.type === 'Property') {
    role = 'DataHolder'
  } else if (row.type === 'Class') {
    role = 'Structure' // 稍微区分一下类和纯数据
  } else {
    // Method
    const isUI = calls.some(callId =>
      UI_KEYWORDS.some(kw => callId.includes(kw))
    )

    if (isUI) {
      role = 'UI'
    } else if (lines > 5 && calls.length > 0) {
      role = 'CoreLogic'
    } else {
      role = lines <= 3 ? 'DataHolder' : 'Helper'
    }
  }

  let score = 0
  score += Math.min(lines, 20)
  score += Math.min(calls.length * 2, 20)

  // type multiplier
  let multiplier = 1.0
  if (row.type === 'Class') {
    multiplier = 0.5
  }
  if (row.type === 'Property') {
    multiplier = 0.2
  }
  if (role === 'DataHolder') {
    multiplier = 0.1
  }
  if (role === 'CoreLogic') {
    multiplier = 1.2
  }

  score *= multiplier

  let weight = score / 40.0
  if (weight > 1.0) {
    weight = 1.0
  }
  if (weight < 0.01) {
    weight = 0.01
  }

  return { role, weight }
}

console.log('🔄 开始分析代码逻辑特征...')

const rows = db
  .query('SELECT id, type, code_body, calls FROM code_nodes')
  .all() as DbRow[]

const updateStmt = db.prepare(`
  UPDATE code_nodes 
  SET code_role = $role, weight = $weight 
  WHERE id = $id
`)

const transaction = db.transaction((items: DbRow[]) => {
  let logicCount = 0

  for (const row of items) {
    const { role, weight } = analyzeNode(row)

    if (role === 'CoreLogic') {
      logicCount += 1
    }

    updateStmt.run({
      $id: row.id,
      $role: role,
      $weight: weight,
    })
  }

  console.log(`📊 CoreLogic 节点数量: ${logicCount}`)
})

const start = performance.now()
transaction(rows)
const end = performance.now()
const time = (end - start).toFixed(2)

console.log(`✅ 完成分析 ${rows.length} 个节点，耗时 ${time}ms`)
