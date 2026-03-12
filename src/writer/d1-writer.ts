/**
 * D1Logger：将 CallRecord 写入 Cloudflare D1 的 Logger 实现。
 * 通过 D1 REST API：POST /client/v4/accounts/:account_id/d1/database/:database_id/query
 */

import type { LogEntity, Logger } from "../recorder.js";

export interface D1LoggerConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
  /** 可选，默认 https://api.cloudflare.com */
  baseUrl?: string;
}

export class D1Logger implements Logger {
  private static readonly DEFAULT_BASE = "https://api.cloudflare.com";

  private static readonly INSERT_SQL = `INSERT OR REPLACE INTO llm_calls (
    request_id, timestamp_request, model, messages, extra_params,
    success, timestamp_response, latency_ms, response_message, usage,
    finish_reason, error_type, error_message, status_code, source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  private config: D1LoggerConfig;

  constructor(config: D1LoggerConfig) {
    this.config = config;
  }

  private toJson(v: unknown): string | null {
    if (v == null) return null;
    try {
      return JSON.stringify(v);
    } catch {
      return null;
    }
  }

  private async d1Query(
    sql: string,
    params: unknown[]
  ): Promise<{ success: boolean; error?: string }> {
    const base = this.config.baseUrl ?? D1Logger.DEFAULT_BASE;
    const url = `${base}/client/v4/accounts/${this.config.accountId}/d1/database/${this.config.databaseId}/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
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

  public write(record: LogEntity): void {
    const params = [
      record.request_id,
      record.timestamp_request,
      record.model,
      this.toJson(record.messages) ?? "[]",
      this.toJson(record.extra_params) ?? "{}",
      record.success ? 1 : 0,
      record.timestamp_response ?? null,
      record.latency_ms ?? null,
      this.toJson(record.response_message),
      this.toJson(record.usage),
      record.finish_reason ?? null,
      record.error_type ?? null,
      record.error_message ?? null,
      record.status_code ?? null,
      record.source ?? null,
    ];
    void this.d1Query(D1Logger.INSERT_SQL, params).then((r) => {
      if (!r.success) console.error("[transparent-llm-log:D1Logger]", r.error);
    });
  }
}


