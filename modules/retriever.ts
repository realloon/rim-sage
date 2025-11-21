import type { SearchResult } from '../types'
import OpenAI from 'openai'
import { em } from '../helper/config'
import { db } from '../helper/db'

const openai = new OpenAI()

export async function retrieveCandidates(
  query: string,
  topK: number = 20
): Promise<SearchResult[]> {
  const embeddingResp = await openai.embeddings.create({
    model: em,
    input: query,
  })
  const queryVector = new Float32Array(embeddingResp.data[0].embedding)

  // 2. SQL Query
  const results = db
    .query(
      `
      SELECT 
        vec.rowid, 
        vec.distance, 
        node.id, node.name, node.full_name,
        node.code_role, node.summary, node.weight,
        node.file_path, node.start_line,
        node.code_body, node.calls, node.called_by
      FROM code_vectors vec
      JOIN code_nodes node ON vec.rowid = node.rowid
      WHERE vec.embedding MATCH ?
      AND k = ?
      ORDER BY vec.distance
      `
    )
    .all(queryVector, topK) as any[]

  return results.map(r => ({
    ...r,
    calls: JSON.parse(r.calls ?? '[]'),
    called_by: JSON.parse(r.called_by ?? '[]'),
  }))
}
