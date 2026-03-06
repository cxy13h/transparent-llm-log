/**
 * 将 LLMCallRecord 写入 Cloudflare D1。
 * 使用 D1 REST API：POST /client/v4/accounts/:account_id/d1/database/:database_id/query
 */

import type { LLMCallRecord } from "./recorder.js";

export interface D1WriterConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
  /** 可选，默认 https://api.cloudflare.com */
  baseUrl?: string;
}

const DEFAULT_BASE = "https://api.cloudflare.com";

function toJson(v: unknown): string | null {
  if (v == null) return null;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

async function d1Query(
  config: D1WriterConfig,
  sql: string,
  params: unknown[]
): Promise<{ success: boolean; error?: string }> {
  const base = config.baseUrl ?? DEFAULT_BASE;
  const url = `${base}/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  const body = (await res.json()) as { success?: boolean; errors?: Array<{ message?: string }> };
  if (!res.ok) {
    const msg = body.errors?.[0]?.message ?? body?.errors ?? res.statusText;
    return { success: false, error: String(msg) };
  }
  if (body.success === false) {
    return { success: false, error: String(body.errors ?? "Unknown D1 error") };
  }
  return { success: true };
}

/**
 * 返回可传给 LLMCallRecorder 的 customWriter，将每条记录 INSERT 到 D1 的 llm_calls 表。
 * 写入为异步（fire-and-forget），不阻塞主流程。
 */
export function createD1Writer(config: D1WriterConfig): (record: LLMCallRecord) => void {
  const sql = `INSERT INTO llm_calls (
    request_id, timestamp_request, model, messages, extra_params,
    success, timestamp_response, latency_ms, response_message, usage,
    finish_reason, error_type, error_message, status_code, source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  return (record: LLMCallRecord) => {
    const params = [
      record.request_id,
      record.timestamp_request,
      record.model,
      toJson(record.messages) ?? "[]",
      toJson(record.extra_params) ?? "{}",
      record.success ? 1 : 0,
      record.timestamp_response ?? null,
      record.latency_ms ?? null,
      toJson(record.response_message),
      toJson(record.usage),
      record.finish_reason ?? null,
      record.error_type ?? null,
      record.error_message ?? null,
      record.status_code ?? null,
      record.source ?? null,
    ];
    void d1Query(config, sql, params).then((r) => {
      if (!r.success) console.error("[transparent-llm-log D1]", r.error);
    });
  };
}

/**
 * 执行一条只读 SQL（用于测试或查询），返回 D1 API 的原始 JSON。
 */
export async function d1QuerySelect(
  config: D1WriterConfig,
  sql: string,
  params: unknown[] = []
): Promise<{ success: boolean; result?: unknown[]; error?: string }> {
  const base = config.baseUrl ?? DEFAULT_BASE;
  const url = `${base}/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  const body = (await res.json()) as {
    success?: boolean;
    result?: Array<{ results?: unknown[] }>;
    errors?: Array<{ message?: string }>;
  };
  if (!res.ok) {
    const msg = body.errors?.[0]?.message ?? res.statusText;
    return { success: false, error: String(msg) };
  }
  if (body.success === false) {
    return { success: false, error: String(body.errors ?? "Unknown D1 error") };
  }
  const results = body.result?.[0]?.results ?? [];
  return { success: true, result: results as unknown[] };
}
