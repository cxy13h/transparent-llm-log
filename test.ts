import OpenAI from "openai";
import { LogHub, LocalLogger, D1Logger, FetchInterceptor } from "./dist/index.js";

async function runTest() {
  console.log("=== 正在初始化 transparent-llm-log ===");

  const localPath = "logs/test_calls.jsonl";
  const d1Config = {
    accountId: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_D1_DATABASE_ID!,
    apiToken: process.env.TRANSPARENT_LLM_LOG_CLOUDFLARE_API_TOKEN!,
  };

  // 1. 初始化 LogHub 和两种 Logger
  const hub = new LogHub({
    loggers: [
      new LocalLogger(localPath),
      new D1Logger(d1Config),
    ],
  });

  // 2. 实例化 FetchInterceptor 拦截器（面向对象风格）
  const interceptor = new FetchInterceptor({ hub, source: "test_script" });

  // 3. 将其具体的 intercept 方法挂载到 OpenAI Client
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    fetch: interceptor.intercept,
  });

  console.log("配置就绪，即将发起 OpenAI 请求...");

  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

  try {
    const start = performance.now();
    const res = await client.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: "你好，请简单的介绍一下自己。" }],
    });
    const duration = (performance.now() - start).toFixed(2);

    console.log(`\n✅ AI 响应成功！(耗时: ${duration} ms) 返回结果如下:`);
    console.log(res.choices[0].message.content);

    console.log("\n✅ transparent-llm-log 已在后台完成拦截与记录！");
  } catch (error) {
    console.error("❌ 请求或记录失败:", error);
  }
}

runTest();
