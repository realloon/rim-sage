import type { CodeNode } from '../types'
import { file } from 'bun'
import { sourcePath } from '../helper/config'
import { db } from '../helper/db'

db.run(`
CREATE TABLE IF NOT EXISTS code_nodes (
  id TEXT PRIMARY KEY,
  name TEXT,
  full_name TEXT,
  type TEXT,
  code_body TEXT,
  file_path TEXT,
  start_line INTEGER,
  calls TEXT,
  called_by TEXT,
  summary TEXT,
  code_role TEXT,
  weight REAL
);
`)

console.log('✅ 数据库表已就绪')

const source: CodeNode[] = await file(sourcePath).json()

console.log(`📂 读取到 ${source.length} 条代码元数据`)

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO code_nodes (
    id, name, full_name, type, code_body, file_path, start_line, calls, called_by
  ) VALUES (
    $id, $name, $fullName, $type, $codeBody, $filePath, $startLine, $calls, $calledBy
  );
`)

const transaction = db.transaction((nodes: CodeNode[]) => {
  nodes.forEach(node => {
    insertStmt.run({
      $id: node.id,
      $name: node.name,
      $fullName: node.fullName,
      $type: node.type,
      $codeBody: node.codeBody,
      $filePath: node.filePath,
      $startLine: node.startLine,
      $calls: JSON.stringify(node.calls), // sqlite does not support array
      $calledBy: JSON.stringify(node.calledBy),
    })
  })
})

const start = performance.now()
transaction(source)
const end = performance.now()
const time = (end - start).toFixed(2)

console.log(`🚀 成功入库 ${source.length} 条数据，耗时 ${time}ms`)
