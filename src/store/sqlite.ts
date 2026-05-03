import Database from 'better-sqlite3'
import type { LogRecord } from '../types.js'
import type { Store } from './types.js'

export interface SqliteStoreOptions {
  path: string
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS llm_logs (
  requestId  TEXT PRIMARY KEY,
  protocol   TEXT NOT NULL,
  timestamp  INTEGER NOT NULL,
  durationMs INTEGER NOT NULL,
  statusCode INTEGER NOT NULL,
  url        TEXT NOT NULL,
  source     TEXT,
  input      TEXT NOT NULL,
  output     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_protocol ON llm_logs(protocol);
CREATE INDEX IF NOT EXISTS idx_timestamp ON llm_logs(timestamp);
`

export class SqliteStore implements Store {
  private db: Database.Database
  private stmt: Database.Statement

  constructor(options: SqliteStoreOptions) {
    this.db = Database(options.path)
    this.db.exec(CREATE_TABLE_SQL)
    this.stmt = this.db.prepare(
      'INSERT INTO llm_logs (requestId, protocol, timestamp, durationMs, statusCode, url, source, input, output) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
  }

  write(record: LogRecord): void {
    try {
      const { common, input, output } = record
      this.stmt.run(
        common.requestId,
        common.protocol,
        common.timestamp,
        common.durationMs,
        common.statusCode,
        common.url,
        common.source ?? null,
        JSON.stringify(input),
        JSON.stringify(output)
      )
    } catch (err) {
      console.error('[transparent-llm-log] SqliteStore write error:', err)
    }
  }

  close(): void {
    this.db.close()
  }
}
