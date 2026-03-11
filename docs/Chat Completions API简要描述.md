## 📋 **请求参数 (Request Parameters)**

**主要端点**: `POST /v1/chat/completions`

### 核心参数及格式：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| **model** | string | ✅ 是 | AI模型标识符，如 `"gpt-4o"`、`"o3-mini"` 等 |
| **messages** | array | ✅ 是 | 包含对话历史的消息数组 |
| **frequency_penalty** | number | ❌ 否 | -2.0到2.0之间，正值根据文本中现有频率惩罚新token，降低重复率 |
| **presence_penalty** | number | ❌ 否 | -2.0到2.0之间，正值根据文本中是否出现过惩罚新token，鼓励谈论新话题 |
| **max_completion_tokens** | integer | ❌ 否 | 生成输出token的最大数量（官方推荐使用，替代旧版 max_tokens） |
| **max_tokens** | integer | ❌ 否 | 遗留参数，生成输出的最大token数 |
| **n** | integer | ❌ 否 | 每条请求生成的选项（响应）数量，默认为 1 |
| **temperature** | number | ❌ 否 | 0到2之间，控制输出随机性（更高的值会使输出更随机） |
| **top_p** | number | ❌ 否 | 0到1之间，控制核采样，替代 temperature 调整输出随机性 |
| **response_format** | object | ❌ 否 | 指定模型输出的格式（如 JSON Object 模式或 JSON Schema 结构化强制输出） |
| **seed** | integer | ❌ 否 | 尽最大努力进行确定性采样的种子（便于重复请求获取相似结果） |
| **stop** | string \| array | ❌ 否 | 使API停止生成更多token的字符串或字符串数组 |
| **stream** | boolean | ❌ 否 | 是否启用流式输出，使用 Server-Sent Events (SSE) 逐步返回数据块 |
| **tools** | array | ❌ 否 | 模型可以调用的工具列表，如预先定义的 function 函数 |
| **tool_choice** | string \| object | ❌ 否 | 指定模型应该调用哪个工具（如 `"none"`, `"auto"`, `"required"` 或具体的工具对象） |
| **audio** | object | ❌ 否 | 音频输出的相关参数配置（需要开启对应 modality） |
| **modalities** | array | ❌ 否 | 设置输出模式，如支持语音时可以设为 `["text", "audio"]` |
| **service_tier** | string | ❌ 否 | 用以指定请求的处理层级，如 `"auto"` 或 `"default"` |
| **store** | boolean | ❌ 否 | 是否允许 OpenAI 平台持久化存储当前对话内容 |

### messages 参数详细格式：

```json
// messages必须是一个数组
"messages": [
  {
    "role": "system",
    "content": "你是一个有用的助手。"
  },
  {
    "role": "user",
    "content": "请解释量子力学。"
  },
  // 支持多模态内容（如带图片的请求）
  {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "这张图片里有什么？"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://...",
          "detail": "high"
        }
      }
    ]
  }
]
```

### tools 与 tool_choice：

```json
"tools": [
  {
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "获取指定地点的天气",
      "parameters": {
        "type": "object",
        "properties": {
          "location": { "type": "string", "description": "城市及省份，如 北京" }
        },
        "required": ["location"]
      }
    }
  }
],
// 强制要求调用特定函数
"tool_choice": {
  "type": "function",
  "function": {"name": "get_weather"}
}
```

### response_format 指定结构化输出：

```json
"response_format": {
  "type": "json_schema",
  "json_schema": {
    "name": "math_response",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "steps": {
          "type": "array",
          "items": {"type": "string"}
        },
        "final_answer": {"type": "string"}
      },
      "required": ["steps", "final_answer"],
      "additionalProperties": false
    }
  }
}
```

---

## 📤 **返回结果 (Response Format)**

API调用成功后将返回一个 **ChatCompletion** 对象，包含生成的响应或调用的请求明细。

### 响应对象结构 (非流式)：

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4o-2024-05-13",
  "system_fingerprint": "fp_44709d6fcb",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "量子力学是...",
        "tool_calls": null
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}
```

### 工具调用返回示例：

```json
"choices": [
  {
    "index": 0,
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "get_weather",
            "arguments": "{\n  \"location\": \"北京\"\n}"
          }
        }
      ]
    },
    "logprobs": null,
    "finish_reason": "tool_calls"
  }
]
```

### 字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| **id** | string | 此次响应结果的唯一标识符 |
| **object** | string | 固定值 `"chat.completion"` 或开启流式时的 `"chat.completion.chunk"` |
| **created** | integer | 响应创建时的 Unix 时间戳 |
| **model** | string | 生成请求所确实使用的模型名称 |
| **system_fingerprint** | string | 用于标识后端运行环境特征（可配合观察 seed 采样结果的一致性） |
| **choices** | array | 包含输出结果的数组。每项内含索引(`index`)、完整的消息内容(`message`)及决定停止生成的原因(`finish_reason`，例如"stop"、"length" 或"tool_calls") |
| **usage** | object | Token 使用量的详细统计，包含输入 (`prompt_tokens`)、生成 (`completion_tokens`) 及总计 (`total_tokens`) Token 数。可能还嵌套更详细的 `prompt_tokens_details` 或 `completion_tokens_details` 用于计费或数据诊断 |
| **service_tier** | string | 当前处理的层级标识 |

---

## 🔗 **参考文档**

- **Chat Completions 官方端点定义**: [官方文档指南](https://platform.openai.com/docs/api-reference/chat/completions)
- **Chat Completions Response 对象构成**: [官方对象结构参考](https://platform.openai.com/docs/api-reference/chat/object)

---

## 💡 **与 Responses API 的关系对比**

1. **Messages 核心结构不同**：Chat Completions 使用包含丰富角色的 `messages` 数组参数进行历史状态传递与控制；Responses API 用更宽泛泛用的 `input` 字段进行接驳。
2. **底层设计演进**：Chat Completions 是广受业界使用和各类第三方代理高度兼容的成熟端点，支持市面上的核心大语言模型与推量推理（o1/o3）系列等，仍在长期维护。Responses API 则专门瞄准下一代极简多模态集成和复杂智能体打造。
3. **广泛的应用基础**：尽管 OpenAI 推出了最新的 Responses 概念，但 Chat 完成仍提供如流控制、高细粒度 Token 配置、完整的工具调用功能；两者在 `temperature`, `response_format`, `tools` 表现出一致的标准语义。
