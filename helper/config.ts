import { join } from 'path'

export const useLibSqlite3 = process.env.USE_LIB_SQLITE3 === 'TRUE'

// path
export const envPath = join(import.meta.dir, '../.env')
export const dbPath = join(import.meta.dir, '../dist/rag.db')
export const sourcePath = join(import.meta.dir, '../assets/metadata.json')
export const libSqlite3Path = join(import.meta.dir, '../assets/libsqlite3.dylib')

if (!process.env.LLM) {
  throw new Error(`env var "LLM" is missing. Editor: ${envPath}`)
}

if (!process.env.EMBEDDING_MODEL) {
  throw new Error(`env var "EMBEDDING_MODEL" is missing. Editor: ${envPath}`)
}

if (!process.env.VECTOR_DIM) {
  throw new Error(`env var "VECTOR_DIM" is missing. Editor: ${envPath}`)
}

// model
export const em = process.env.EMBEDDING_MODEL
export const llm = process.env.LLM

// parms
export const vectorDim = Number(process.env.VECTOR_DIM)
