/**
 * D1Logger：将 CallRecord 写入 Cloudflare D1 的 Logger 实现。
 * 通过 D1 REST API：POST /client/v4/accounts/:account_id/d1/database/:database_id/query
 */

import type { LogEntity, Logger } from "./recorder.js";

export interface D1LoggerConfig {
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
  config: D1LoggerConfig,
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

const INSERT_SQL = `INSERT OR REPLACE INTO llm_calls (
  request_id, timestamp_request, model, messages, extra_params,
  success, timestamp_response, latency_ms, response_message, usage,
  finish_reason, error_type, error_message, status_code, source
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export class D1Logger implements Logger {
  constructor(private config: D1LoggerConfig) {}

  write(record: LogEntity): void {
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
    void d1Query(this.config, INSERT_SQL, params).then((r) => {
      if (!r.success) console.error("[transparent-llm-log:D1Logger]", r.error);
    });
  }
}


