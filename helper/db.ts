import { Database } from 'bun:sqlite'
import * as sqliteVec from 'sqlite-vec'
import { useLibSqlite3, libSqlite3Path, dbPath } from './config'

if (useLibSqlite3) {
  Database.setCustomSQLite(libSqlite3Path)
}

export const db = new Database(dbPath)

sqliteVec.load(db)
