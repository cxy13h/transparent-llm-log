/**
 * 包装 fetch：仅对 chat/completions 请求做无感记录（请求体、时间戳、成功与否、回调结果等）。
 * 请求/响应格式遵循 OpenAI Chat Completions API，详见 docs/chat-completions-protocol-review.md。
 */

import type { LLMCallRecord, LLMCallRecorder } from "./recorder.js";

const CHAT_COMPLETIONS = "chat/completions";

function parseBody(body: string | null): Record<string, unknown> | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 请求体：协议要求 model + messages 必填，其余归入 extra_params */
function extractRequest(body: Record<string, unknown>): {
  messages: Record<string, unknown>[];
  model: string;
  extra_params: Record<string, unknown>;
} {
  const rawMessages = body.messages;
  const messages = Array.isArray(rawMessages) ? rawMessages as Record<string, unknown>[] : [];
  const model = typeof body.model === "string" ? body.model : "";
  const extra_params = { ...body };
  delete extra_params.messages;
  delete extra_params.model;
  return { messages, model, extra_params };
}

/** 响应体：仅处理非流式；取 choices[0].message / finish_reason 及顶层 usage */
function extractResponse(body: Record<string, unknown>): {
  message?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  finish_reason?: string;
} {
  const choices = body.choices as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(choices) || !choices[0]) return {};
  const first = choices[0];
  const message = first.message;
  const finishReason = first.finish_reason;
  return {
    message: message != null && typeof message === "object" ? message as Record<string, unknown> : undefined,
    usage: body.usage != null && typeof body.usage === "object" ? body.usage as Record<string, unknown> : undefined,
    finish_reason: typeof finishReason === "string" ? finishReason : undefined,
  };
}

/**
 * 流式结束时写入的汇总记录。
 * 当前未实现流式解析，此类型仅作预留；实现时由消费端聚合 content/usage 后填入 LLMCallRecord 并传入回调。
 */
export type StreamCompletionRecord = LLMCallRecord;

export interface CreateLoggingFetchOptions {
  recorder: LLMCallRecorder;
  source?: string;
  /** 实际发请求的 fetch，默认 globalThis.fetch */
  realFetch?: typeof fetch;
  /**
   * 落库模式：sync = 等落库完成后再把响应返回给调用方；async = 先返回响应，落库在后台执行，不阻塞调用方。
   * 默认 "sync"。
   */
  writeMode?: "sync" | "async";
  /**
   * 预留：流式（stream: true）请求在流结束后的汇总记录回调。
   * 当前不实现流式解析，此回调不会被调用；后续实现时将在聚合 SSE 得到完整 message/usage 后调用。
   */
  onStreamComplete?: (record: StreamCompletionRecord) => void;
}

export function createLoggingFetch(options: CreateLoggingFetchOptions): typeof fetch {
  const { recorder, source, realFetch = globalThis.fetch, writeMode = "sync", onStreamComplete } = options;
  // 预留：后续若实现流式，可在此根据 reqBody?.stream === true 分支处理 SSE，结束时调用 onStreamComplete(aggregatedRecord)
  // 异步模式下串行落库，避免并发 appendFile 导致本地 JSONL 行顺序错乱
  let writeTail: Promise<void> = Promise.resolve();
  const doWrite = (record: LLMCallRecord) => {
    if (writeMode === "async") {
      writeTail = writeTail
        .then(() => recorder.writeAsync(record))
        .catch((err) => console.error("[transparent-llm-log]", err));
    } else {
      recorder.write(record);
    }
  };

  return async function loggingFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes(CHAT_COMPLETIONS)) {
      return realFetch(input, init);
    }

    const requestId = crypto.randomUUID();
    const timestampRequest = new Date().toISOString();
    const start = performance.now();

    let bodyStr: string | null = null;
    if (typeof init?.body === "string") {
      bodyStr = init.body;
    } else if (init?.body instanceof Blob) {
      bodyStr = await init.body.text();
    }
    const reqBody = parseBody(bodyStr);
    let messages: Record<string, unknown>[] = [];
    let model = "";
    let extra_params: Record<string, unknown> = {};
    if (reqBody) {
      const ext = extractRequest(reqBody);
      messages = ext.messages;
      model = ext.model;
      extra_params = ext.extra_params;
    }

    // ---- 请求阶段落库（响应字段留空） ----
    const requestRecord: LLMCallRecord = {
      request_id: requestId,
      timestamp_request: timestampRequest,
      model,
      messages,
      extra_params,
      success: false,
      source,
    };
    doWrite(requestRecord);

    try {
      const response = await realFetch(input, init);
      // 响应返回后，写入完整记录（D1 会覆盖同一 request_id记录；JSONL 会另追加一行）。
      const end = performance.now();
      const latencyMs = Math.round((end - start) * 100) / 100;
      const timestampResponse = new Date().toISOString();
      const success = response.ok;

      let responseMessage: Record<string, unknown> | undefined;
      let usage: Record<string, unknown> | undefined;
      let finishReason: string | undefined;
      let errorType: string | undefined;
      let errorMessage: string | undefined;

      const cloned = response.clone();
      const text = await cloned.text();
      const respBody = parseBody(text);

      if (success && respBody) {
        const ext = extractResponse(respBody);
        responseMessage = ext.message;
        usage = ext.usage;
        finishReason = ext.finish_reason;
      } else if (!success) {
        errorType = "http_error";
        const err = respBody?.error;
        if (err != null && typeof err === "object" && "message" in err && typeof (err as Record<string, unknown>).message === "string") {
          errorMessage = (err as Record<string, unknown>).message as string;
        } else if (typeof err === "string") {
          errorMessage = err;
        } else {
          errorMessage = text;
        }
      }

      // ---- 响应阶段落库（完整记录） ----
      const record: LLMCallRecord = {
        request_id: requestId,
        timestamp_request: timestampRequest,
        model,
        messages,
        extra_params,
        success,
        timestamp_response: timestampResponse,
        latency_ms: latencyMs,
        response_message: responseMessage,
        usage,
        finish_reason: finishReason,
        error_type: errorType,
        error_message: errorMessage,
        status_code: response.status,
        source,
      };
      doWrite(record);

      return response;
    } catch (e) {
      const end = performance.now();
      const latencyMs = Math.round((end - start) * 100) / 100;
      const timestampResponse = new Date().toISOString();
      const err = e instanceof Error ? e : new Error(String(e));
      // ---- 响应阶段落库（异常） ----
      const record: LLMCallRecord = {
        request_id: requestId,
        timestamp_request: timestampRequest,
        model,
        messages,
        extra_params,
        success: false,
        timestamp_response: timestampResponse,
        latency_ms: latencyMs,
        error_type: err.name,
        error_message: err.message,
        status_code: undefined,
        source,
      };
      doWrite(record);
      throw e;
    }
  };
}
