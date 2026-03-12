# transparent-llm-log

## 项目用途
`transparent-llm-log` 是一个零侵入的 OpenAI Chat Completions 调用日志库。

## 主要特性
- 无需改动请求逻辑即可拦截 `chat/completions` 调用。
- 记录请求/响应、延迟、用量与错误信息。
- 支持多种日志落地：本地 JSONL 与 Cloudflare D1。
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
  messages: [{ role: "user", content: "你好" }],
});

console.log(res.choices[0].message.content);
```

## D1 表结构
使用 [docs/schema.sql](docs/schema.sql) 创建 D1 表。

## 备注
- 当前拦截器聚焦 `chat/completions` 端点与非流式响应。
