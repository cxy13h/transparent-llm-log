export type Protocol = 'openai-chat-completions' | 'openai-responses' | 'claude-messages'

export interface CommonFields {
  requestId: string
  timestamp: number
  durationMs: number
  protocol: Protocol
  statusCode: number
  url: string
  source?: string
}

export interface LogRecord {
  common: CommonFields
  input: unknown
  output: unknown
}
