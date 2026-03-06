# transparent-llm-log

## 功能作用

`transparent-llm-log` 是一个 **无感 LLM 调用日志记录库**，通过劫持 OpenAI SDK 的 `fetch` 参数，自动记录每次 Chat Completions 的请求与响应结果。

每次调用会落库 **两次**，通过同一个 `request_id` 关联：

1. **请求发出前** — 立即写入请求侧信息（model、messages、参数等），响应字段留空。即使后续网络超时或进程崩溃，也至少有一条请求记录可追溯
2. **响应返回后** — 写入完整记录（补上 latency、response、usage、error 等），对 D1 会自动覆盖同一条记录

适用场景：

- 🔍 **调用审计** — 完整记录提示词、模型参数、响应内容，便于合规审查
- 🐛 **问题排查** — 记录错误类型、状态码、延迟，快速定位故障
- 📊 **用量统计** — 记录 token 消耗（prompt / completion / total），支撑成本分析

---

## 简要特性

| 特性 | 说明 |
|------|------|
| 🔌 无侵入接入 | 仅需传入自定义 `fetch`，业务代码零修改 |
| 📝 完整记录 | 覆盖请求（messages、model、参数）和响应（content、usage、latency、error）两侧 |
| 💾 落库灵活 | 支持本地 JSONL、Cloudflare D1，或两者组合 |
| ⚡ 写入模式可选 | `sync`（默认，先落库再返回）/ `async`（先返回，后台落库） |
| 🏷️ 多 Agent 标识 | 通过 `source` 参数区分不同调用来源 |

---

## 环境要求

- **Node.js** ≥ 18

---

## 安装

```bash
npm install transparent-llm-log
```

---

## 快速使用

### 一、仅落库到本地 JSONL

最简用法，日志写入本地文件，目录不存在会自动创建。

```ts
import OpenAI from "openai";
import { createFileRecorder, createLoggingFetch } from "transparent-llm-log";

const recorder = createFileRecorder("logs/llm_calls.jsonl");
const client = new OpenAI({
  apiKey: "你的 OpenAI API Key",
  fetch: createLoggingFetch({ recorder, source: "my_agent", writeMode: "async" }),
});

const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});
```

> 每次调用会在 JSONL 中追加两行：第一行仅含请求信息，第二行为完整记录。消费时按 `request_id` 取最后一条即可。

---

### 二、仅落库到 Cloudflare D1

首次使用前需在 D1 控制台执行 [schema.sql](./docs/schema.sql) 建表。

`createD1Writer` 接收三个参数，均可在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 获取：

| 参数 | 获取方式 |
|------|----------|
| `accountId` | Dashboard 右侧栏 Account ID |
| `databaseId` | Workers & Pages → D1 → 对应数据库详情页 |
| `apiToken` | My Profile → API Tokens，需含 D1 读写权限 |

```ts
import OpenAI from "openai";
import { LLMCallRecorder, createLoggingFetch, createD1Writer } from "transparent-llm-log";

const recorder = new LLMCallRecorder({
  customWriter: createD1Writer({
    accountId: "你的 Account ID",
    databaseId: "你的 D1 Database ID",
    apiToken: "你的 API Token",
  }),
});

const client = new OpenAI({
  apiKey: "你的 OpenAI API Key",
  fetch: createLoggingFetch({ recorder, source: "my_agent" }),
});
```

> D1 使用 `INSERT OR REPLACE`，响应返回后的完整记录会自动覆盖请求阶段的记录，最终每次调用在 D1 中只保留一条完整记录。

---

### 三、同时落库到本地 + D1

将本地文件路径与 D1 Writer 组合传入即可：

```ts
import { LLMCallRecorder, createLoggingFetch, createD1Writer } from "transparent-llm-log";

const recorder = new LLMCallRecorder({
  logPath: "logs/llm_calls.jsonl",
  customWriter: createD1Writer({
    accountId: "你的 Account ID",
    databaseId: "你的 D1 Database ID",
    apiToken: "你的 API Token",
  }),
});

const client = new OpenAI({
  apiKey: "你的 OpenAI API Key",
  fetch: createLoggingFetch({ recorder, source: "my_agent", writeMode: "async" }),
});
```

---

## 文档说明

| 文档 | 说明 |
|------|------|
| [schema.sql](./docs/schema.sql) | D1 建表 SQL，首次使用 D1 落库前需执行 |
| [chat-completions-protocol-review.md](./docs/chat-completions-protocol-review.md) | 记录字段与 OpenAI Chat Completions 协议的对应关系 |

---

## License

ISC
