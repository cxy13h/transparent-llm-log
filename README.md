# transparent-llm-log

无感记录每次 **OpenAI Chat Completions** 的请求与回调结果，支持落库到本地 JSONL 或 Cloudflare D1，便于审计、排查与用量统计。

## 特性

- **无侵入**：通过配置传入自定义 fetch 即可接入，业务代码不改
- **完整记录**：请求（messages、model、参数）、响应（content、usage、latency_ms、success）、错误信息
- **落库灵活**：仅本地 / 仅 D1 / 本地 + D1，可任选或组合

## 环境要求

- Node.js 18+

## 安装

```bash
npm install transparent-llm-log
```

## 快速使用

```ts
import OpenAI from "openai";
import { createFileRecorder, createLoggingFetch } from "transparent-llm-log";

const recorder = createFileRecorder("logs/llm_calls.jsonl");
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: createLoggingFetch({ recorder, source: "my_agent", writeMode: "async" }),
});

// 之后 client.chat.completions.create(...) 会被自动记录
const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});
```

---

## 记录内容

### 请求侧

| 要素 | 说明 |
|------|------|
| 时间戳 | 请求发起时间（ISO），便于算延迟、排查 |
| 提示词 / messages | 完整 messages，便于复现与审计 |
| 模型 | model，用于统计用量、成本 |
| 参数 | temperature、max_tokens 等 |
| 请求 ID | 自生成 UUID |
| 调用来源 | 可选 source，便于区分 Agent |

### 响应侧（回调结果）

| 要素 | 说明 |
|------|------|
| 是否成功 | success，区分 2xx / 4xx / 5xx、超时、网络错误 |
| 延迟 | latency_ms |
| 回复内容 | response_message（content、role、tool_calls 等） |
| Usage | prompt_tokens、completion_tokens、total_tokens |
| finish_reason | stop / length / tool_calls 等 |
| 错误信息 | 失败时的 error_type、error_message、status_code |

---

## 接入与行为

将 `createLoggingFetch(...)` 的返回值作为 OpenAI 客户端的 `fetch` 传入即可，仅对 Chat Completions 请求做记录。

### 落库时机

等结果返回后再落库，不会在请求发出时先落库。每条记录包含请求与响应（或错误）的完整信息。

### 同步 / 异步（writeMode）

| 模式 | 说明 | 适用 |
|------|------|------|
| sync（默认） | 先落库完成再返回响应；落库失败会抛给调用方 | 需要「返回前已落库」或希望落库异常直接暴露 |
| async | 先返回响应，落库在后台执行；落库失败仅打日志 | 优先降低延迟、落库允许最终一致 |

异步模式下本地文件行顺序与请求完成顺序一致。不传 `writeMode` 时为 `"sync"`。

---

## 落库方式（本地 / D1）

| 方式 | 说明 |
|------|------|
| 仅本地文件 | `createFileRecorder(logPath)`，写入指定路径 JSONL，目录不存在会自动创建 |
| 仅 D1 | `new LLMCallRecorder({ customWriter: createD1Writer(config) })`，通过 Cloudflare D1 REST API 写入 |
| 本地 + D1 | `new LLMCallRecorder({ logPath, customWriter: createD1Writer(config) })` |

---

## 环境变量与完整示例

### 环境变量

- 公共：`OPENAI_BASE_URL`、`OPENAI_API_KEY`，可选 `OPENAI_MODEL`
- 写 D1 时：`TRANSPARENT_LLM_LOG_CLOUDFLARE_ACCOUNT_ID`、`TRANSPARENT_LLM_LOG_CLOUDFLARE_D1_DATABASE_ID`、`TRANSPARENT_LLM_LOG_CLOUDFLARE_API_TOKEN`  
  可在项目根目录自建 `.env` 配置。

### 仅落库到本地

```ts
import "dotenv/config";
import OpenAI from "openai";
import { createFileRecorder, createLoggingFetch } from "transparent-llm-log";

const recorder = createFileRecorder("logs/llm_calls.jsonl");
const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
  fetch: createLoggingFetch({ recorder, source: "my_agent", writeMode: "async" }),
});
```

### 仅落库到 D1

D1 需先执行 [docs/schema.sql](./docs/schema.sql) 建表。

```ts
import { LLMCallRecorder, createLoggingFetch, createD1Writer } from "transparent-llm-log";

const recorder = new LLMCallRecorder({
  customWriter: createD1Writer({
    accountId: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_D1_DATABASE_ID!,
    apiToken: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_API_TOKEN!,
  }),
});
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: createLoggingFetch({ recorder, source: "my_agent" }),
});
```

### 同时写本地与 D1

```ts
const recorder = new LLMCallRecorder({
  logPath: "logs/llm_calls.jsonl",
  customWriter: createD1Writer(d1Config),
});
```

---

## 扩展

- **流式**：当前仅支持非流式；流式预留了 `onStreamComplete` 回调，后续版本可支持。
- **多 Agent**：为不同 Agent 传入不同 `source` 即可按来源区分。

---

## 文档

- [docs/schema.sql](./docs/schema.sql)：D1 建表 SQL
- [docs/d1-schema-design.md](./docs/d1-schema-design.md)：D1 表结构说明
- [docs/chat-completions-protocol-review.md](./docs/chat-completions-protocol-review.md)：与 Chat Completions 协议的对应关系

## License

ISC
