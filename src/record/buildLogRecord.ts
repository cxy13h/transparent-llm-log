import type { LogRecord, CommonFields, Protocol } from '../types.js'

export function buildLogRecord(
  url: string,
  statusCode: number,
  durationMs: number,
  protocol: Protocol,
  reqBody: unknown,
  resBody: unknown,
  source?: string
): LogRecord {
  const common: CommonFields = {
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    durationMs,
    protocol,
    statusCode,
    url,
    source,
  }
  return { common, input: reqBody, output: resBody }
}
