/**
 * LocalLogger：将 CallRecord 追加写入本地 JSONL 文件的 Logger 实现。
 * 内部维护一条串行 Promise 队列，保证高并发下的文件追加顺序正确。
 */

import fsPromises from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import type { LogEntity, Logger } from "./recorder.js";

export class LocalLogger implements Logger {
  private writeTail: Promise<void> = Promise.resolve();

  constructor(private logPath: string) {
    const dir = path.dirname(logPath);
    if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
  }

  write(record: LogEntity): Promise<void> {
    this.writeTail = this.writeTail
      .then(() => fsPromises.appendFile(this.logPath, JSON.stringify(record) + "\n", "utf-8"))
      .catch((err) => console.error("[transparent-llm-log:LocalLogger]", err));
    return this.writeTail;
  }
}
