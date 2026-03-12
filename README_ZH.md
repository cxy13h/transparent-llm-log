# transparent-llm-log

一个零侵入的 LLM API 调用日志库，支持 OpenAI Chat Completions 协议。

## 特性

- 零侵入：无需修改业务代码
- 完整记录：捕获请求参数、响应内容、耗时、用量统计、错误信息
- 多种存储：支持本地 JSONL 文件和 Cloudflare D1 数据库

## 安装

```bash
npm install transparent-llm-log
```

## 快速开始

```typescript
import OpenAI from "openai";
import { LogHub, LocalLogger, D1Logger, FetchInterceptor } from "transparent-llm-log";

// 1. 配置日志存储
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

// 2. 创建拦截器
const interceptor = new FetchInterceptor({ hub, source: "my-app" });

// 3. 注入到 OpenAI 客户端
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  fetch: interceptor.intercept,
});

// 4. 正常使用 OpenAI API
const res = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "你好" }],
});
```

## D1 数据库初始化

在使用 Cloudflare D1 数据库前，需先创建数据库表：

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
