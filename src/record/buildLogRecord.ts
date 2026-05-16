import type { LogRecord, CommonFields, Protocol } from '../types.js'

export function buildLogRecord(
  url: string,
  statusCode: number,
  requestReceivedAt: number,
  responseReceivedAt: number,
  protocol: Protocol,
  reqBody: unknown,
  resBody: unknown,
  source?: string
): LogRecord {
  const common: CommonFields = {
    requestId: crypto.randomUUID(),
    requestReceivedAt,
    responseReceivedAt,
    protocol,
    statusCode,
    url,
    source,
  }
  return { common, input: reqBody, output: resBody }
}
