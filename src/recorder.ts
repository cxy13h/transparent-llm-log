/**
 * LLM 调用记录：单次调用的请求与响应（或错误）结构及写入逻辑。
 * 支持 JSONL 文件或自定义 writer；支持同步 write 与异步 writeAsync。
 */

import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

export interface LLMCallRecord {
  request_id: string;
  timestamp_request: string;
  model: string;
  messages: Record<string, unknown>[];
  extra_params: Record<string, unknown>;

  success: boolean;
  timestamp_response?: string;
  latency_ms?: number;
  response_message?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  finish_reason?: string;

  error_type?: string;
  error_message?: string;
  status_code?: number;

  source?: string;
}

export type LLMCallRecorderWriter = (payload: LLMCallRecord) => void | Promise<void>;

export interface LLMCallRecorderOptions {
  /** 本地 JSONL 文件路径，每条记录一行 JSON；目录不存在时会自动创建 */
  logPath?: string;
  /** 自定义写入逻辑（如写 D1）；可与 logPath 同时使用，先执行 customWriter 再写 logPath */
  customWriter?: LLMCallRecorderWriter;
}

/**
 * 仅落库到本地指定路径的 JSONL 文件，等价于 new LLMCallRecorder({ logPath })。
 */
export function createFileRecorder(logPath: string): LLMCallRecorder {
  return new LLMCallRecorder({ logPath });
}

export class LLMCallRecorder {
  private logPath?: string;
  private customWriter?: LLMCallRecorderWriter;

  constructor(options: LLMCallRecorderOptions = {}) {
    this.logPath = options.logPath;
    this.customWriter = options.customWriter;
    if (this.logPath) {
      const dir = path.dirname(this.logPath);
      if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
    }
  }

  /** 同步落库：写完后返回，调用方会等待落库完成。 */
  write(record: LLMCallRecord): void {
    const payload = { ...record };
    this.customWriter?.(payload);
    if (this.logPath) {
      fs.appendFileSync(this.logPath, JSON.stringify(payload) + "\n", "utf-8");
    }
  }

  /**
   * 异步落库：不阻塞调用方；若 customWriter 返回 Promise 会 await，本地文件用异步 API 写入。
   * 落库失败时 reject，由调用方决定是否捕获（如仅打日志）。
   */
  async writeAsync(record: LLMCallRecord): Promise<void> {
    const payload = { ...record };
    const writerResult = this.customWriter?.(payload);
    await Promise.resolve(writerResult);
    if (this.logPath) {
      await fsPromises.appendFile(this.logPath, JSON.stringify(payload) + "\n", "utf-8");
    }
  }
}
