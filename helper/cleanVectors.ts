import { Database } from 'bun:sqlite'
import { join } from 'path'
import * as sqliteVec from 'sqlite-vec'

const db = new Database(join(import.meta.dir, '../dist/rag.db'))

sqliteVec.load(db)

try {
  db.run('DROP TABLE IF EXISTS code_vectors')
  console.log('✅ 成功删除虚拟表 code_vectors')
} catch (error) {
  console.error('❌ 删除失败:', error)
}
