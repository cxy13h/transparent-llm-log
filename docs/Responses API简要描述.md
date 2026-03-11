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
    "type": "web_search"
  },
  {
    "type": "file_search",
    "vector_store_ids": ["vs_xxx"]
  },
  {
    "type": "code_interpreter"
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

## 💡 **与Chat Completions的主要区别**

1. `messages` → `input`（更灵活的输入格式）
2. `response_format` → `text.format`（结构化输出）
3. 内置原生工具支持（web_search、file_search等）
4. 支持有状态对话（通过conversation ID）
5. 支持推理模型的高级参数（如reasoning.effort）

Responses API是OpenAI推荐的最新接口，适合构建具有工具调用、结构化输出和多模态能力的智能应用。
