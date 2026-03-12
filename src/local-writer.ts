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

  public write(record: LogEntity): Promise<void> {
    // 将这次追加操作作为一个独立方法挂载到队列尾部
    const nextTail = this.appendToFile(record);
    this.writeTail = nextTail;
    return nextTail;
  }

  private async appendToFile(record: LogEntity): Promise<void> {
    try {
      // 在这个标准的 async 方法内部，我们依然可以等待前一个任务执行完毕
      await this.writeTail;
    } catch (ignore) {
      // 忽略前一个任务的失败，保证队列继续运行
    }

    try {
      await fsPromises.appendFile(this.logPath, JSON.stringify(record) + "\n", "utf-8");
    } catch (err) {
      console.error("[transparent-llm-log:LocalLogger]", err);
    }
  }
}
