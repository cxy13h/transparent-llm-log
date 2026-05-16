import type { Protocol } from '../types.js'
import type { Store } from '../store/types.js'
import { buildLogRecord } from '../record/buildLogRecord.js'

const PROTOCOL_MAP: Array<{ pattern: RegExp; protocol: Protocol }> = [
  { pattern: /\/v1\/chat\/completions(\/|$)/, protocol: 'openai-chat-completions' },
  { pattern: /\/v1\/responses(\/|$)/, protocol: 'openai-responses' },
  { pattern: /\/v1\/messages(\/|$)/, protocol: 'claude-messages' },
]

function matchProtocol(url: string): Protocol | null {
  for (const { pattern, protocol } of PROTOCOL_MAP) {
    if (pattern.test(url)) return protocol
  }
  return null
}

export interface CreateLLMFetchOptions {
  stores: Store[]
  source?: string
  fetch?: typeof globalThis.fetch
}

async function readRequestBody(request: Request): Promise<unknown> {
  try {
    const cloned = request.clone()
    const text = await cloned.text()
    if (!text) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    const cloned = response.clone()
    const text = await cloned.text()
    if (!text) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function createLLMFetch(options: CreateLLMFetchOptions): typeof globalThis.fetch {
  const { stores, source } = options
  const baseFetch = options.fetch ?? globalThis.fetch

  const wrappedFetch: typeof globalThis.fetch = async (input, init) => {
    const requestReceivedAt = Date.now()
    const request = new Request(input, init)
    const url = request.url

    const protocol = matchProtocol(url)
    if (!protocol) {
      return baseFetch(input, init)
    }

    try {
      const reqBody = await readRequestBody(request)

      const response = await baseFetch(request)
      const responseReceivedAt = Date.now()
      const statusCode = response.status

      const resBody = await readResponseBody(response)

      const record = buildLogRecord(
        url,
        statusCode,
        requestReceivedAt,
        responseReceivedAt,
        protocol,
        reqBody,
        resBody,
        source
      )

      for (const store of stores) {
        try {
          store.write(record)
        } catch (err) {
          console.error('[transparent-llm-log] store write error:', err)
        }
      }

      return response
    } catch (err) {
      console.error('[transparent-llm-log] interception error:', err)
      return baseFetch(input, init)
    }
  }

  return wrappedFetch
}
