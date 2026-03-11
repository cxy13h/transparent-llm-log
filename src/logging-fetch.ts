/**
 * trackFetch：包装 fetch，对 chat/completions 请求进行无感记录。
 * 请求/响应格式遵循 OpenAI Chat Completions API。
 */

import type { LogEntity, LogHub } from "./recorder.js";

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

export class FetchInterceptor {
  private hub: LogHub;
  private source?: string;
  private realFetch: typeof fetch;

  constructor(options: { hub: LogHub; source?: string; realFetch?: typeof fetch }) {
    this.hub = options.hub;
    this.source = options.source;
    this.realFetch = options.realFetch || globalThis.fetch;
    this.intercept = this.intercept.bind(this);
  }

  /**
   * 拦截执行真正的请求。
   * 该方法兼容原生的 fetch 签名。
   */
  public async intercept(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes(CHAT_COMPLETIONS)) {
      return this.realFetch(input, init);
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
    const requestRecord: LogEntity = {
      request_id: requestId,
      timestamp_request: timestampRequest,
      model,
      messages,
      extra_params,
      success: false,
      source: this.source,
    };
    this.hub.write(requestRecord);

    try {
      const response = await this.realFetch(input, init);
      // 此时只收到了响应头，我们先把响应时间打个戳
      const timestampResponse = new Date().toISOString();
      const success = response.ok;

      let responseMessage: Record<string, unknown> | undefined;
      let usage: Record<string, unknown> | undefined;
      let finishReason: string | undefined;
      let errorType: string | undefined;
      let errorMessage: string | undefined;

      // 开始下载并缓冲大模型一点点挤出来的全盘响应流
      const cloned = response.clone();
      const text = await cloned.text();
      
      // 当连珠炮一样的文字彻底下完后，才是真实的最终业务耗时！
      const end = performance.now();
      const latencyMs = Math.round((end - start) * 100) / 100;

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
      const record: LogEntity = {
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
        source: this.source,
      };
      this.hub.write(record);

      return response;
    } catch (e) {
      const end = performance.now();
      const latencyMs = Math.round((end - start) * 100) / 100;
      const timestampResponse = new Date().toISOString();
      const err = e instanceof Error ? e : new Error(String(e));
      // ---- 响应阶段落库（异常） ----
      const record: LogEntity = {
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
        status_code: 500,
        source: this.source,
      };
      this.hub.write(record);
      throw e;
    }
  };
}
