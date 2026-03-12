# transparent-llm-log

## Purpose
`transparent-llm-log` is a zero-intrusion logging library for OpenAI Chat Completions calls.

## Key Features
- Intercepts `chat/completions` calls without changing your request code.
- Records request/response, latency, usage, and error information.
- Pluggable log backends: local JSONL file and Cloudflare D1.
## Quick Start

```ts
import OpenAI from "openai";
import { LogHub, LocalLogger, D1Logger, FetchInterceptor } from "transparent-llm-log";

const localPath = "logs/llm_calls.jsonl";

const hub = new LogHub({
  loggers: [
    new LocalLogger(localPath),
    new D1Logger({
      accountId: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_ACCOUNT_ID!,
      databaseId: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_D1_DATABASE_ID!,
      apiToken: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_API_TOKEN!,
    }),
  ],
});

const interceptor = new FetchInterceptor({ hub, source: "app" });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  fetch: interceptor.intercept,
});

const res = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
});

console.log(res.choices[0].message.content);
```

## D1 Schema
Create the D1 table with [docs/schema.sql](docs/schema.sql).

## Notes
- This interceptor focuses on the `chat/completions` endpoint and non-streaming responses.