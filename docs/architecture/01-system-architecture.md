# 系统架构（System Architecture）

> 项目：AI Diagram Hub（`ai-draw-nexus`）
> 文档范围：系统整体构成、角色、边界、数据流、关键约束。
> 本文件仅为说明文档，不改动任何代码。

---

## 1. 系统定位

AI Diagram Hub 是一个 AI 驱动的图表生成平台。用户用自然语言描述图表（或粘贴图片 / 文档 / 图表源码 / URL），
AI 直接生成以下三种渲染引擎之一的图表：

| 引擎 | 内容格式 | 适用场景 |
|---|---|---|
| Mermaid | Mermaid 源码文本 | 流程图、时序图、类图等代码驱动图 |
| Excalidraw | Excalidraw 元素 JSON 数组 | 手绘风格、头脑风暴 |
| Draw.io | `mxGraphModel` XML | 专业、复杂图表 |

核心设计取舍：**无服务端数据库**。所有用户数据（项目、版本历史、聊天记录）都存储于浏览器 IndexedDB（Dexie）。
后端仅是一个薄代理（thin proxy），负责把请求转发给 OpenAI 兼容接口或 Anthropic 接口。

---

## 2. 系统组成（逻辑视图）

```
┌─────────────────────────────────────────────────────────────────┐
│                          用户（浏览器）                            │
│                                                                   │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │  页面/路由    │   │  状态管理      │   │  本地持久化          │  │
│  │  (React 19)  │──▶│  (Zustand x3) │──▶│  (Dexie/IndexedDB) │  │
│  └──────┬───────┘   └───────┬───────┘   └────────────────────┘  │
│         │                   │                                     │
│         │            ┌──────▼────────────────┐                    │
│         │            │  编排层 useAIGenerate  │                    │
│         │            └──────┬────────────────┘                    │
│         │                   │                                     │
│  ┌──────▼───────────────────▼───────────────────────────────┐   │
│  │  渲染引擎层：Mermaid / Excalidraw / Draw.io （各自 iframe/  │   │
│  │  SVG/canvas 渲染，统一 ref API：export/showSource 等）      │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  aiService（HTTP 客户端 / SSE 解析 / 鉴权 & 配额上下文）    │   │
│  └───────────────┬───────────────────────────────────────────┘   │
└──────────────────┼───────────────────────────────────────────────┘
                   │  HTTPS  POST /api/chat | /api/llm | /api/parse-url | GET /api/health
┌──────────────────▼───────────────────────────────────────────────┐
│               后端：Cloudflare Pages Functions（functions/）       │
│   chat.ts   → 转发上游（流式 / 非流式），归一化 SSE                │
│   llm.ts    → BYOK 模型列表/连通性测试（SSRF 防护）                │
│   parse-url.ts → 网页正文抽取（Readability + Turndown）           │
│   health.ts → 健康检查                                            │
└──────────────────┬───────────────────────────────────────────────┘
                   │  HTTPS（携带服务端或用户自带的 API Key）
┌──────────────────▼───────────────────────────────────────────────┐
│        上游模型服务：OpenAI 兼容 API / Anthropic API               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. 系统角色与职责

| 角色 | 载体 | 职责 |
|---|---|---|
| 前端应用 | React 19 + Vite | 页面路由、交互、渲染、本地存储、SSE 消费 |
| 编排层 | `src/hooks/useAIGenerate.ts` | 维度输入组装、调用 AI、校验、Mermaid 自动修复、写三处 store、版本落库、缩略图 |
| HTTP 客户端 | `src/services/aiService.ts` | 代理/直连两种模式、鉴权头、配额检查、SSE 归一化解析 |
| 状态存储 | Zustand x3 + Dexie + localStorage | 见 §5 |
| 后端代理 | Cloudflare Pages Functions | 密钥托管、请求转发、SSE 归一化、URL 解析 |
| 上游模型 | OpenAI 兼容 / Anthropic | 实际推理与生成 |

---

## 4. 端到端主数据流（AI 生成）

```
用户输入
  → ChatPanel / HomePage
  → useAIGenerate.generate()
      ├─ 组装多模态内容（当前画布缩略图 image_url + 文本 + 附件）
      ├─ 选取引擎系统提示词（src/lib/prompts/）
      ├─ aiService.streamChat()  → POST /api/chat
      │       └─ functions/api/chat.ts → resolveLlmSettings → 上游 SSE
      ├─ extractCode()（剥离 markdown 代码围栏）
      ├─ validateContent()（按引擎校验）
      │       └─ Mermaid 失败 → 请求模型修复（最多 3 次，MAX_MERMAID_FIX_ATTEMPTS）
      ├─ 写 editorStore.setContentFromVersion()（置于画布）
      ├─ VersionRepository.create()（版本历史快照）
      ├─ chatStore.saveMessage()（持久化助手消息 + code）
      └─ 生成缩略图 → ProjectRepository.update()（更新缩略图与 updatedAt）
```

三种内容格式对应三种校验方式：
- Mermaid：动态 `import('mermaid')` + `mermaid.parse()`
- Excalidraw：JSON 解析（裸数组或 `{elements:[]}`）
- Draw.io：`DOMParser` 校验 `mxGraphModel > root > ≥1 mxCell`

---

## 5. 三处易混淆的存储（关键概念）

| Store | 位置 | 存储内容 | 用途 |
|---|---|---|---|
| `chatStore` | Zustand | `ChatMessage[]` | 面向 UI 的消息列表（角色、状态、附件、生成的 `code`） |
| `payloadStore` | Zustand | `PayloadMessage[]` | 实际发往 `/api/chat` 的 OpenAI 兼容请求体 |
| `editorStore` | Zustand | 当前项目 + 画布内容 | 画布上内容的唯一真相来源 |

`useAIGenerate` 同时写入这三处：一条 UI 消息、请求体、编辑器内容。

持久化层（Zustand 之外）：
- **IndexedDB (Dexie)** — 项目、版本历史、聊天记录（见部署/应用架构文档）。
- **localStorage** — 每日配额、访问密码、自定义 LLM 配置、Mermaid 主题、界面语言。

---

## 6. 三种运行模式（AI 调用路径分叉）

1. **默认代理模式**：浏览器 → `/api/chat` → 后端用环境变量密钥调用上游。
2. **BYOK 代理模式**：用户在设置中配置自定义 LLM（`X-Custom-LLM: true` + 配置随请求体），后端用请求体中的配置调用上游；此类请求配额豁免。
3. **BYOK 直连模式**：浏览器直接调用 `{baseUrl}/chat/completions` 或 `{baseUrl}/messages`，完全绕过后端（可能受 CORS 限制）。

优先级：有效自定义配置 > 访问密码 > 每日免费配额。

---

## 7. 关键约束与非功能性说明

- **无服务端持久化**：数据不出浏览器（除发往模型的推理请求外），隐私友好，但也意味着换设备/清缓存即丢失。
- **配额在前端强制执行**（`VITE_DAILY_QUOTA`，默认 10）；设置 `ACCESS_PASSWORD` 的请求配额豁免。
- **后端不记录请求体**（可能含用户 API Key）。
- **`/api/llm` 是受限转发器**：拒绝 loopback/私网/链路本地地址与非 http(s) 协议，防止 SSRF。
- **构建期类型检查只覆盖 `src/`**：`tsc -b` 的 `tsconfig.app.json` 仅 include `src`，`functions/` 不在构建期类型检查内，后端类型错误只在 wrangler 运行时暴露。
- **无测试框架**：验证方式为 `pnpm run build`（类型检查）+ `pnpm run lint` + 浏览器手测。
- **两阶段生成代码路径存在但被禁用**：`useAIGenerate` 中 `useTwoPhase` 硬编码为 `false`，所有引擎走单阶段。

---

## 8. 与其他文档的关系

- 技术架构：见 `02-technical-architecture.md`
- 部署架构：见 `03-deployment-architecture.md`
- 应用架构：见 `04-application-architecture.md`
