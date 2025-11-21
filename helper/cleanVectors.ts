import { db } from '#helper/db'

try {
  db.run('DROP TABLE IF EXISTS code_vectors')
  console.log('✅ 成功删除虚拟表 code_vectors')
} catch (error) {
  console.error('❌ 删除失败:', error)
}
