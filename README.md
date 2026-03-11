# transparent-llm-log

English | [简体中文](./README_ZH.md)

## Overview

`transparent-llm-log` is a **zero-intrusion** LLM call logging library. By wrapping the `fetch` function of the OpenAI SDK, it automatically records the request and response of every Chat Completions call.

Each API call is logged **twice** under the same `request_id`:

1. **Before the request is sent**: Logs the request context (model, messages, parameters, etc.) with empty response fields. This ensures you still have an audit trail even if the network times out or the process crashes.
2. **After the response is received**: Logs the complete record (including latency, response, usage, error, etc.). When using D1, the initial record is automatically overwritten with this complete one.

Ideal for the following scenarios:

- 🔍 **Call Auditing**: Keep a complete record of prompts, model parameters, and responses for compliance.
- 🐛 **Troubleshooting**: Record error types, status codes, and latency to quickly pinpoint failures.
- 📊 **Usage Analytics**: Log token consumption (prompt/completion/total) to support cost analysis.

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🔌 Zero Intrusion | Simply pass in a custom `fetch`; zero modifications needed to your business logic. |
| 📝 Complete Records | Covers both the request (messages, model, params) and response (content, usage, latency, error) sides. |
| 💾 Flexible Storage | Supports local files, Cloudflare D1 databases, or both simultaneously. |
| ⚡ Configurable Write Mode | `sync` (default, wait for write to finish before returning) / `async` (return immediately, write in background). |
| 🏷️ Multi-Agent Tracking | Distinguish calls from different origins using the `source` parameter. |

---

## Requirements

- **Node.js** ≥ 18

---

## Installation

```bash
npm install transparent-llm-log
```

---

## Quick Start

### 1. Log to a Local JSONL File

The simplest use case. Logs will be written to a local file, and the directory will be automatically created if it doesn't exist.

```ts
import OpenAI from "openai";
import { LogHub, LocalLogger, trackFetch } from "transparent-llm-log";

// Initialize the log hub with a local file Logger
const hub = new LogHub({
  loggers: [new LocalLogger("logs/llm_calls.jsonl")],
});

// Use trackFetch to wrap the OpenAI client's fetch method
const client = new OpenAI({
  apiKey: "YOUR_OPENAI_API_KEY",
  fetch: trackFetch({ hub, source: "my_agent" }),
});

// Call the OpenAI SDK as usual — it's automatically logged!
const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});
```

> Each API call appends two lines to the JSONL file: the first line contains only the request info, and the second is the complete record (request info and response). 

---

### 2. Log strictly to Cloudflare D1

Before executing, you need to create the table in your D1 database using [schema.sql](./docs/schema.sql).

The `createD1Writer` function takes three parameters, all of which can be found in the [Cloudflare Dashboard](https://dash.cloudflare.com/):

| Parameter | Where to find it |
|-----------|------------------|
| `accountId` | Right sidebar of the main Dashboard. |
| `databaseId` | Workers & Pages → D1 → Your database details page. |
| `apiToken` | My Profile → API Tokens (requires D1 read/write permissions). |

```ts
import OpenAI from "openai";
import { LogHub, D1Logger, trackFetch } from "transparent-llm-log";

// Initialize the log hub with a D1 Logger
const hub = new LogHub({
  loggers: [
    new D1Logger({
      accountId: "YOUR_ACCOUNT_ID",
      databaseId: "YOUR_D1_DATABASE_ID",
      apiToken: "YOUR_API_TOKEN",
    })
  ]
});

// Use trackFetch to wrap the OpenAI client's fetch method
const client = new OpenAI({
  apiKey: "YOUR_OPENAI_API_KEY",
  fetch: trackFetch({ hub, source: "my_agent" }),
});
```

> D1 utilizes `INSERT OR REPLACE`, so the complete record retrieved upon the response automatically overwrites the initial request-only record. Thus, exactly one complete record is retained per call.

---

### 3. Log securely to Local + D1

To use both, provide the local file path alongside the D1 custom writer:

```ts
import OpenAI from "openai";
import { LogHub, LocalLogger, D1Logger, trackFetch } from "transparent-llm-log";

// Initialize the log hub with both local file and D1 loggers
const hub = new LogHub({
  loggers: [
    new LocalLogger("logs/llm_calls.jsonl"),
    new D1Logger({
      accountId: "YOUR_ACCOUNT_ID",
      databaseId: "YOUR_D1_DATABASE_ID",
      apiToken: "YOUR_API_TOKEN",
    })
  ]
});

// Use trackFetch to wrap the OpenAI client's fetch method
const client = new OpenAI({
  apiKey: "YOUR_OPENAI_API_KEY",
  fetch: trackFetch({ hub, source: "my_agent" }),
});
```

---

## Documentation

| File | Description |
|------|-------------|
| [schema.sql](./docs/schema.sql) | Table creation SQL for D1. Run this before your first run with D1. |
---

## License

ISC
