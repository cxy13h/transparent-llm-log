/**
 * LocalLogger：将 CallRecord 追加写入本地 JSONL 文件的 Logger 实现。
 * 允许并发写入，不保证严格顺序。
 */

import fsPromises from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import type { LogEntity, Logger } from "../recorder.js";

export class LocalLogger implements Logger {
  constructor(private logPath: string) {
    const dir = path.dirname(logPath);
    if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
  }

  public write(record: LogEntity): void {
    void this.appendToFile(record);
  }

  private async appendToFile(record: LogEntity): Promise<void> {
    try {
      await fsPromises.appendFile(this.logPath, JSON.stringify(record) + "\n", "utf-8");
    } catch (err) {
      console.error("[transparent-llm-log:LocalLogger]", err);
    }
  }
}
