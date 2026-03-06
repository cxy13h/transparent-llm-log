# transparent-llm-log

## 功能作用

`transparent-llm-log` 是一个 **无感 LLM 调用日志记录库**，通过劫持 OpenAI SDK 的 `fetch` 参数，自动记录每次 Chat Completions 的请求与响应结果。

适用于以下场景：

- 🔍 **调用审计**：完整记录提示词、模型参数、响应内容，便于合规审查
- 🐛 **问题排查**：记录错误类型、状态码、延迟等信息，快速定位故障
- 📊 **用量统计**：记录 token 消耗（prompt / completion / total），支撑成本分析

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

### 一、仅落库到本地

最简用法，日志写入本地文件，目录不存在会自动创建。

```ts
import OpenAI from "openai";
import { createFileRecorder, createLoggingFetch } from "transparent-llm-log";

const recorder = createFileRecorder("logs/llm_calls.jsonl");


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: createLoggingFetch({ recorder, source: "my_agent", writeMode: "async" }),
});

const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});
```

---

### 二、仅落库到 Cloudflare D1

#### 1. 配置环境变量

在项目根目录创建 `.env` 文件，填入以下配置：

```env
# Cloudflare D1 配置（必填）
TRANSPARENT_LLM_LOG_CLOUDFLARE_ACCOUNT_ID=你的_Cloudflare_Account_ID
TRANSPARENT_LLM_LOG_CLOUDFLARE_D1_DATABASE_ID=你的_D1_Database_ID
TRANSPARENT_LLM_LOG_CLOUDFLARE_API_TOKEN=你的_Cloudflare_API_Token
```

> **获取方式：**
> - `ACCOUNT_ID`：登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → 右侧栏可见
> - `D1_DATABASE_ID`：在 Workers & Pages → D1 中创建数据库后获取
> - `API_TOKEN`：在 My Profile → API Tokens 中创建，需包含 D1 写权限

#### 2. 初始化数据库

首次使用前，需执行建表 SQL：

```bash
# 在 Cloudflare Dashboard 的 D1 控制台中执行 docs/schema.sql
```

参考 [schema.sql](./docs/schema.sql) 中的建表语句。

#### 3. 代码接入

```ts
import "dotenv/config";
import OpenAI from "openai";
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

---

### 三、同时落库到本地 + D1

将本地文件路径与 D1 Writer 组合传入即可：

```ts
import { LLMCallRecorder, createLoggingFetch, createD1Writer } from "transparent-llm-log";

const recorder = new LLMCallRecorder({
  logPath: "logs/llm_calls.jsonl",
  customWriter: createD1Writer({
    accountId: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_D1_DATABASE_ID!,
    apiToken: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_API_TOKEN!,
  }),
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
