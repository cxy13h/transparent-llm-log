# transparent-llm-log

A zero-intrusion LLM API call logging library supporting OpenAI Chat Completions protocol.

## Features

- Zero Intrusion: No need to modify business code
- Complete Recording: Captures request parameters, response content, latency, usage statistics, and error information
- Multiple Storage Options: Supports local JSONL files and Cloudflare D1 database

## Installation

```bash
npm install transparent-llm-log
```

## Quick Start

```typescript
import OpenAI from "openai";
import { LogHub, LocalLogger, D1Logger, FetchInterceptor } from "transparent-llm-log";

// 1. Configure log storage
const hub = new LogHub({
  loggers: [
    new LocalLogger("logs/llm_calls.jsonl"),
    new D1Logger({
      accountId: "cloudflare_account_id",
      databaseId: "d1_database_id",
      apiToken: "cloudflare_api_token(edit)",
    }),
  ],
});

// 2. Create interceptor
const interceptor = new FetchInterceptor({ hub, source: "my-app" });

// 3. Inject into OpenAI client
const client = new OpenAI({
  apiKey: "**",
  baseURL: "**",
  fetch: interceptor.intercept,
});

// 4. Use OpenAI API normally
const res = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
});
```

## D1 Database Setup

Before using D1Logger, create the database table in Cloudflare D1:

```sql
CREATE TABLE IF NOT EXISTS llm_calls (
  request_id TEXT PRIMARY KEY,
  timestamp_request TEXT NOT NULL,
  model TEXT NOT NULL,
  messages TEXT NOT NULL,
  extra_params TEXT,
  success INTEGER NOT NULL,
  timestamp_response TEXT,
  latency_ms REAL,
  response_message TEXT,
  usage TEXT,
  finish_reason TEXT,
  error_type TEXT,
  error_message TEXT,
  status_code INTEGER,
  source TEXT
);
```

## License

ISC
