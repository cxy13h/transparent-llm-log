import type { LogRecord } from '../types.js'

export interface Store {
  write(record: LogRecord): void
  close(): void
}
