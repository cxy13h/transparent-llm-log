# transparent-llm-log

`transparent-llm-log` is an LLM API call logging library for TypeScript/Node.js.

It wraps `fetch`, automatically records LLM requests and responses made by SDKs such as OpenAI and Anthropic, and saves them to SQLite. Your business calling code stays unchanged.

## Install

```bash
npm install transparent-llm-log
```

## Usage

```typescript
import { createLLMFetch, SqliteStore } from 'transparent-llm-log'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const store = new SqliteStore({ path: './llm-logs.db' })
const fetch = createLLMFetch({ stores: [store], source: 'my-app' })

const openai = new OpenAI({ fetch })
const anthropic = new Anthropic({ fetch })

// LLM requests made through the SDKs are now logged to llm-logs.db
```
