/**
 * CallRecord：单次 API 调用的请求与响应结构。
 * LogHub：管理所有 Logger 实例的调度中心，负责将记录分发给各 Logger。
 */

export interface LogEntity {
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

/**
 * 所有 Logger 实现的公共接口，可以是本地文件写入、远程数据库写入等。
 */
export interface Logger {
  write(record: LogEntity): void | Promise<void>;
}

/**
 * 日志调度中心：接收日志记录，并将其分发给所有注册的 Logger。
 */
export class LogHub {
  private loggers: Logger[];

  constructor(options: { loggers?: Logger[] } = {}) {
    this.loggers = options.loggers ?? [];
  }

  /**
   * 将记录分发给所有 Logger 异步执行，立即返回不阻塞调用方。
   */
  public write(record: LogEntity): void {
    for (let i = 0; i < this.loggers.length; i++) {
      const logger = this.loggers[i];
      void this.executeLogger(logger, record);
    }
  }

  private async executeLogger(logger: Logger, record: LogEntity): Promise<void> {
    try {
      await logger.write(record);
    } catch (err) {
      console.error("[transparent-llm-log:LogHub] Logger Error:", err);
    }
  }
}
