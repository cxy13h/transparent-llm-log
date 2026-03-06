# Chat Completions 协议说明

本功能对齐 **OpenAI Chat Completions API**（及兼容实现）的请求与响应约定，记录内容基于以下协议范围。

## 请求体（POST /v1/chat/completions）

- **必填**：`model` (string)、`messages` (array of message objects)。
- **常见可选**：`temperature`, `max_tokens`, `top_p`, `stream`, `tools`, `tool_choice`, `response_format`, `seed` 等。

## 响应体（非流式，HTTP 200）

- **顶层**：`id`, `choices` (array), `created`, `model`, `object`（如 `"chat.completion"`）, `usage`（可选）, `system_fingerprint`（可选）等。
- **choices[]**：每项含 `index`, `message`（模型生成的消息对象）, `finish_reason`（如 `"stop"` | `"length"` | `"tool_calls"` | `"content_filter"`）, `logprobs`（可选）。
- **usage**（可选）：`prompt_tokens`, `completion_tokens`, `total_tokens` 等。
- **记录范围**：单次回复场景下记录第一个 choice 的 `message`、`finish_reason` 及顶层 `usage`；若 `choices` 为空则对应字段不填。

## 错误响应（4xx/5xx）

- **常见格式**：`{ "error": { "message": "...", "type": "...", "code": "..." } }`。
- **记录方式**：会记录错误信息（兼容 `error` 为对象或字符串及部分兼容实现的格式），便于排查。

## 流式（stream: true）

- 当前**不支持**流式解析；流式请求的记录中无完整 `response_message` / `usage`。
- 流式场景预留了 `onStreamComplete` 回调，后续版本可在聚合完整结果后写入同一存储。

## 参考

- [Create chat completion](https://platform.openai.com/docs/api-reference/chat/create)
- [Error codes](https://developers.openai.com/api/docs/guides/error-codes/)
