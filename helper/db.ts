import { Database } from 'bun:sqlite'
import * as sqliteVec from 'sqlite-vec'
import { libSqlite3Path, dbPath } from './config'

Database.setCustomSQLite(libSqlite3Path)

export const db = new Database(dbPath)

sqliteVec.load(db)
