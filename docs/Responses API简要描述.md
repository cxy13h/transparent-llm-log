## 📋 **请求参数 (Request Parameters)**

**主要端点**: `POST /v1/responses` 或 `POST /responses`

### 核心参数及格式：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| **model** | string | ✅ 是 | AI模型标识符，如 `"gpt-4o"`、`"gpt-5"` 系列等 |
| **input** | string \| array | ✅ 是 | 用户输入，可以是简单字符串或消息数组 |
| **instructions** | string | ❌ 否 | 系统提示词，设定模型行为和角色 |
| **tools** | array | ❌ 否 | 工具列表（函数调用、web搜索、文件搜索等） |
| **tool_choice** | string \| object | ❌ 否 | 工具使用策略：`"auto"` \| `"none"` \| `"required"` |
| **text** | object | ❌ 否 | 输出格式控制（结构化输出） |
| **temperature** | number | ❌ 否 | 0-2，控制输出随机性 |
| **max_output_tokens** | integer | ❌ 否 | 最大输出token数 |
| **reasoning** | object | ❌ 否 | 推理控制（如 `effort`） |
| **stream** | boolean | ❌ 否 | 是否启用流式响应 |
| **store** | boolean | ❌ 否 | 是否持久化对话状态 |
| **include** | array | ❌ 否 | 额外数据（如logprobs、来源） |

### input 参数详细格式：

```json
// 简单字符串格式
"input": "你好，请写一个故事"

// 消息数组格式（支持多模态）
"input": [
  {
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "请描述这张图片"
      },
      {
        "type": "input_image",
        "detail": "high",  // 或 "low" | "auto" | "original"
        "image_url": "https://..."
      }
    ]
  }
]
```

### tools 参数示例：

```json
"tools": [
  {
    "type": "function",
    "function": {
      "name": "get_weather",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {"type": "string"}
        }
      }
    }
  },
  {
    "type": "web_search" // 原生网络搜索
  },
  {
    "type": "file_search",
    "vector_store_ids": ["vs_xxx"]
  },
  {
    "type": "code_interpreter"
  },
  {
    "type": "mcp", // 连接外部 MCP (Model Context Protocol) 服务器
    "mcp": {
      "server_url": "https://..."
    }
  },
  {
    "type": "computer_use_preview", // 控制虚拟计算机 (屏幕/鼠标/键盘)
    "computer_use_preview": {
      "display_width": 1024,
      "display_height": 768
    }
  },
  {
    "type": "shell" // 原生 Shell 命令执行
  },
  {
    "type": "apply_patch" // 原生代码 Patch 应用工具，用于更新文件内容
  }
]
```

### 结构化输出 (text.format)：

```json
"text": {
  "format": {
    "type": "json_schema",
    "name": "calendar_event",
    "schema": {
      "type": "object",
      "properties": {
        "title": {"type": "string"},
        "date": {"type": "string"},
        "location": {"type": "string"}
      },
      "required": ["title", "date"]
    }
  }
}
```

---

## 📤 **返回结果 (Response Format)**

API返回一个 **Response** 对象，结构如下：

### 响应对象结构：

```json
{
  "id": "resp_abc123",
  "object": "response",
  "created_at": 1234567890,
  "model": "gpt-4o",
  "status": "completed",  // "completed" | "in_progress" | "incomplete"
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "这是模型的回复内容",
          "annotations": [
            {
              "type": "citation",
              "start_index": 10,
              "end_index": 20,
              "url": "https://..."
            }
          ]
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 50,
    "output_tokens": 100,
    "total_tokens": 150
  },
  "error": null
}
```

### 工具调用示例：

```json
"output": [
  {
    "type": "function_call",
    "call_id": "call_123",
    "name": "get_weather",
    "arguments": "{\"location\":\"北京\"}"
  }
]
```

### 字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| **id** | string | 响应唯一标识符 |
| **object** | string | 固定值 `"response"` |
| **created_at** | integer | Unix时间戳 |
| **model** | string | 使用的模型 |
| **status** | string | 状态：`completed` \| `in_progress` \| `incomplete` |
| **output** | array | 输出内容数组 |
| **usage** | object | Token使用统计 |
| **error** | object \| null | 错误信息（如有） |

---

## 🔗 **参考文档**

- **创建响应端点**：https://developers.openai.com/api/reference/resources/responses/methods/create/
- **Response对象定义**：https://developers.openai.com/api/reference/resources/responses/
- **从Chat Completions迁移指南**：https://developers.openai.com/api/docs/guides/migrate-to-responses/

---

## 💡 **与Chat Completions的主要区别核心更新**

1. **输入格式统一**：`messages` 变为 `input`，允许非对话式的直接输入（结构更宽泛灵活）。
2. **结构化输出强化**：`response_format` 改变为直接在顶层可用的 `text` 参数控制 `format`（如 `json_schema`）。
3. **原生超强工具链（区别于 Chat Completions 最重要的一点）**：
   - 不仅支持基础的 `function`, `web_search`, `file_search`, `code_interpreter`。
   - **新增智能体原生工具**：如 `computer_use_preview` (接管计算机操作)、`shell` (运行系统命令)、`mcp` (Model Context Protocol，通过远程连接各种服务连接器如 Google Drive / Dropbox)、`apply_patch` (用于文件内容按 Patch 更新)。
4. **有状态对话与缓存**：支持通过 conversation ID 进行状态持久化（`store`），并强化了 `prompt_caching` 控制。
5. **推理模型的高级参数**：例如更原生的 `reasoning` / `reasoning_effort` 控制。

总的来说，Responses API 是 OpenAI 为**端到端构建智能体（Agentic workflows）**推荐的最新接口，它内置的工具极大程度省去了开发者自己去实现“让 AI 操作电脑”或“让 AI 调用 Shell”的繁琐步骤。
