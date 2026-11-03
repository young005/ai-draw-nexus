# 技术架构（Technical Architecture）

> 项目：AI Diagram Hub（`ai-draw-nexus`）
> 文档范围：技术选型、分层、模块划分、关键实现机制、接口与数据结构。
> 本文件仅为说明文档，不改动任何代码。

---

## 1. 技术栈

### 前端

| 类别 | 选型 | 说明 |
|---|---|---|
| 框架 | React 19.2 | 函数组件 + Hooks |
| 构建 | Vite 7 + `@vitejs/plugin-react` | 极快的 HMR / 构建 |
| 语言 | TypeScript ~5.9（strict） | `verbatimModuleSyntax` 开启，类型导入须 `import type` |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite`） | 通过 `@theme` 定义设计令牌 |
| 路由 | react-router-dom 7 | `BrowserRouter`，见 §3 |
| 状态 | Zustand 5 | 三个业务 store + 一个 toast store |
| 本地数据库 | Dexie 4（IndexedDB） | 项目/版本/聊天三张表 |
| 国际化 | i18next 26 + react-i18next 17 + language-detector | 单命名空间 `translation`，zh-CN / en-US |
| UI 基元 | Radix UI（dialog/dropdown/slot/toast/tooltip） | 搭配 `cn()`（clsx + tailwind-merge） |
| 图标 | lucide-react | — |
| 代码编辑器 | Monaco Editor + `@monaco-editor/react` | 源码面板 |
| 文件解析 | mammoth（docx）、@mozilla/readability + linkedom + turndown（网页正文） | 多模态输入 |
| 工具 | uuid、date-fns | — |

### 渲染引擎依赖

| 引擎 | 库 |
|---|---|
| Mermaid | `mermaid ^11` + `@mermaid-js/layout-elk` + `@mermaid-js/layout-tidy-tree` |
| Excalidraw | `@excalidraw/excalidraw ^0.18` |
| Draw.io | `react-drawio`（iframe 嵌入 `embed.diagrams.net`） |

### 后端

| 类别 | 选型 |
|---|---|
| 运行时 | Cloudflare Workers（Pages Functions 约定） |
| 部署 | Cloudflare Pages（前端）+ Cloudflare Workers（后端） |
| CLI | wrangler ^3.75 |
| 依赖 | linkedom、@mozilla/readability、turndown（URL 解析）；无框架，原生 `onRequest*` handler |
| 类型 | `@cloudflare/workers-types` |

### 工具链

- 包管理：pnpm（`pnpm-workspace.yaml`）
- Lint：ESLint 9 flat config（`eslint.config.js`，忽略 `dist` / `.wrangler`）
- 无测试框架、无 test 脚本

---

## 2. 分层结构

```
┌─────────────────────────────────────────────┐
│ 表现层  src/pages/ + src/features/           │  页面、编辑器、聊天面板、设置
├─────────────────────────────────────────────┤
│ 编排层  src/hooks/useAIGenerate.ts           │  生成主流程、自动修复、落库
├─────────────────────────────────────────────┤
│ 服务层  src/services/                        │  HTTP、用户设置、仓库(Repository)、导入、探测
├─────────────────────────────────────────────┤
│ 状态层  src/stores/ (Zustand)                │  聊天 / 编辑器 / 请求体
├─────────────────────────────────────────────┤
│ 领域层  src/lib/                             │  校验、提示词、缩略图、主题、DB、工具
├─────────────────────────────────────────────┤
│ 类型层  src/types/index.ts                   │  全局领域类型
└─────────────────────────────────────────────┘
```

后端 `functions/` 独立分层：

```
functions/api/*.ts         路由 handler（chat / llm / parse-url / health）
functions/api/_shared/     共享：providers、stream、auth、cors、types
```

---

## 3. 路由与页面

`src/App.tsx`：

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | `HomePage` | 主页，快速生成 |
| `/landing` | `LandingPage` | 营销页 |
| `/projects` | `ProjectsPage` | 项目列表 |
| `/editor/:projectId` | `EditorPage` | 编辑器 |
| `/profile` | `ProfilePage` | 设置（自定义 LLM 等） |
| `*` | `Navigate → /` | 兜底重定向 |

`main.tsx`：`StrictMode` → `createRoot` → `<App/>`，先引入 `./i18n` 与 `./index.css`。

---

## 4. 前端模块职责

### `src/services/`

| 文件 | 职责 |
|---|---|
| `aiService.ts` | 调 `/api/chat`、`/api/parse-url`；代理/直连两种模式；SSE 解析；鉴权上下文构建 |
| `userSettings.ts` | localStorage：访问密码、多个自定义 LLM 配置（含旧单配置迁移） |
| `llmProbe.ts` | `loadLLMModels` / `testLLMConfig`（按配置模式直连或走 `/api/llm`） |
| `projectRepository.ts` | 项目 CRUD；`delete` 在单事务中级联删除版本与聊天；按标题搜索 |
| `versionRepository.ts` | 版本快照 CRUD |
| `chatRepository.ts` | 聊天消息 CRUD（按时间排序） |
| `importService.ts` | `importDiagramAsProject`：校验内容 → 建项目 + 首个版本 |

### `src/stores/`（Zustand）

| Store | 关键状态 / 动作 |
|---|---|
| `chatStore` | `messages`、`projectId`、`isStreaming`；`addMessage`（用户消息立即持久化）、`updateMessage`（**不**持久化，避免流式写库抖动）、`saveMessage`（生成结束才持久化助手消息）、`setActiveProject` |
| `editorStore` | `currentProject`、`currentContent`、`hasUnsavedChanges`、`thumbnailGetter`；selectors `selectEngineType`、`selectIsEmpty` |
| `payloadStore` | `messages: PayloadMessage[]`（真实请求体）、`getPayload()` |
| `useToastStore`（在 hooks 内） | 轻量 toast，5 秒自动消失 |

### `src/hooks/`

| 文件 | 职责 |
|---|---|
| `useAIGenerate.ts` | 生成编排核心（见 §6） |
| `usePasteSource.ts` | 检测粘贴的图表源码并提议“作为新项目导入” |
| `useToast.ts` | toast store + hook |

### `src/lib/`

| 文件 | 职责 |
|---|---|
| `db.ts` | Dexie `DiagramHubDB` 定义（见 §7） |
| `fileUtils.ts` | 文件校验/base64/docx 解析/剪贴板提取；`toAttachment`、`EXT_ENGINE_MAP`、`looksLikeDiagramSource` |
| `llmErrors.ts` | LLM 错误分类与本地化（区分错 key / 未知模型 / 错 baseUrl / 限流 / CORS） |
| `mermaidThemes.ts` | 五种 Mermaid 主题 + themeCSS，持久化键 `ai-draw-nexus.mermaidTheme` |
| `promptBuilder.ts` | `SYSTEM_PROMPTS`、`buildInitialPrompt`、`buildEditPrompt`、`extractCode` |
| `thumbnail.ts` | 缩略图生成（Mermaid→SVG→PNG；Excalidraw→exportToBlob；Draw.io 返回空） |
| `validators/index.ts` | 三引擎内容校验 |
| `utils.ts` | `cn()`、`formatDate` |
| `prompts/{mermaid,excalidraw,drawio,index}.ts` | 各引擎系统提示词 |

### `src/features/`

| 目录 | 内容 |
|---|---|
| `chat/` | `ChatPanel`（消息列表、流式展示、重试、附件、URL 解析） |
| `editor/` | `CanvasArea`（按引擎分发 + ref 转发）、`SourceCodePanel`（Monaco）、`VersionPanel` |
| `engines/mermaid/` | `MermaidRenderer`（渲染 + 缩放/导出/主题） |
| `engines/excalidraw/` | `ExcalidrawEditor` |
| `engines/drawio/` | `DrawioEditor`（嵌入 iframe，注册缩略图 getter） |
| `profile/` | `LLMSettings`（自定义 LLM 配置管理） |
| `project/` | `ImportDialog`、`PasteSourceBanner` |

### 引擎统一 ref API

三个编辑器均为 `forwardRef`，暴露相同接口：
`exportAsSvg` / `exportAsPng` / `exportAsSource` / `showSourceCode` / `hideSourceCode` / `toggleSourceCode`。
`CanvasAreaRef` 额外提供 `getThumbnail()`。
Excalidraw 与 Draw.io 组件以 `projectId` 作 key，切换项目时强制重挂载，避免 Excalidraw 恢复过期 localStorage 场景。

---

## 5. 后端接口（`functions/api/`）

所有 handler 均为 Pages Functions（`onRequestOptions` / `onRequestGet` / `onRequestPost`），统一经 `_shared/cors.ts` 处理 CORS。

### `POST /api/chat`

1. `validateAccessPassword(request, env)` → 不通过返回 `401 {"error":"访问密码错误"}`。
2. 解析 `ChatRequest`（`messages`、`stream`、`llmConfig`），缺 `messages` 返回 400。
3. `resolveLlmSettings(env, llmConfig)`：请求级自定义配置优先于环境变量。
5. 分支：`stream` → `streamAnthropic`/`streamOpenAI`；否则 `callAnthropic`/`callOpenAI`，返回 `{content}`。
6. `UpstreamError` 保留上游状态码，其余 500。**不记录请求体**。

### `POST /api/llm`

BYOK 代理模式下的“加载模型 / 测试连通”转发器。
- Body：`{ action: 'models'|'test', llmConfig }`，需 `baseUrl` + `apiKey`。
- 安全：`isPublicHost` 拦截 localhost、`*.local`/`*.internal`、`0.0.0.0`、IPv6 `fc/fd/fe80`、私网 IPv4 段，仅允许 http(s)。
- `models` → GET `{base}/models`；`test` → POST `{base}/chat/completions`（openai）或 `{base}/messages`（anthropic），`max_tokens:1`。
- 错误以 HTTP 200 + `{ok:false, status, code, detail}` 返回，便于前端读取 `code`。

### `POST /api/parse-url`

`{ url }` → 抓取 → `linkedom` 解析 → Readability 抽取正文 → Turndown 转 Markdown。
对 `mp.weixin.qq.com` 特殊预处理（`#js_content` 可见性、`data-src→src`、剔除二维码/赞赏/标签块）。
返回 `{success, data:{title, content, excerpt, siteName, url}}`。

### `GET /api/health`

返回 `{"status":"ok"}`。

### `_shared/` 共享模块

| 文件 | 职责 |
|---|---|
| `types.ts` | `Env`、`LLMConfig`、`Message`、`ContentPart`、`ChatRequest`、`UpstreamError`、`isUsableLLMConfig`、`resolveLlmSettings` |
| `ai-providers.ts` | `convertContentPartsToAnthropic`、`callOpenAI`、`callAnthropic`（`max_tokens: 64000`；Anthropic system 消息上提） |
| `stream-openai.ts` | `streamOpenAI`：SSE → 归一化 `{"content": "..."}` + `[DONE]` |
| `stream-anthropic.ts` | `streamAnthropic`：`content_block_delta.delta.text` → 归一化 `{"content": ...}` |
| `auth.ts` | `validateAccessPassword` → `{valid, exempt}` |
| `cors.ts` | CORS 头（允许 `X-Access-Password`、`X-Custom-LLM`） |

**SSE 归一化设计**：后端把上游两种 SSE 形状统一 re-wrap 成同一种 `{content}` 格式，前端只需解析一种形状。

---

## 6. 生成与 Mermaid 自动修复循环（`useAIGenerate.ts`）

常量：`USE_STREAMING = true`、`MAX_MERMAID_FIX_ATTEMPTS = 3`、`useTwoPhase = false`（硬编码禁用）。

`generate(userInput, isInitial, attachments?)` 流程：

1. 取 `SYSTEM_PROMPTS[engineType]`；写入用户消息 + 助手占位消息；置 streaming/loading。
2. 选路径：初始 → 单阶段初始生成（两阶段被禁用）；编辑 → 单阶段 + `buildEditPrompt`，并把当前缩略图作为 `image_url` 一起发出。
3. `buildMultimodalContent`：缩略图 → 文本 → 附件（图片 → `image_url`；文档 → `[Document: name]`；URL → `[URL: title]`）。
4. `extractCode`（剥离围栏）→ `validateContent`；Mermaid 失败 → `attemptMermaidAutoFix`（最多 3 次，每次重新校验）。
5. 成功：`setContentFromVersion`（标记已保存）→ `updateMessage` 置完成并附带 `code` → `saveMessage` 持久化 → `VersionRepository.create` → 生成缩略图（Draw.io 走 `thumbnailGetter` 重试 3 次 @500ms，其余走 `generateThumbnail`）→ `ProjectRepository.update` 缩略图 + 刷新 `updatedAt` → 成功 toast。
6. 失败：`updateMessage` 置错误 + `saveMessage` + 错误 toast；finally 清理 streaming/loading。

`retry(assistantMessageId)`：定位前一条用户消息，移除该点之后的助手消息，重跑 `generate`。

---

## 7. 数据模型

### 领域类型（`src/types/index.ts`）

- `EngineType = 'mermaid' | 'excalidraw' | 'drawio'`
- `Project { id, title, engineType, thumbnail, createdAt, updatedAt }`
- `VersionHistory { id, projectId, content, changeSummary, timestamp }`
- `Attachment = ImageAttachment | DocumentAttachment | UrlAttachment`
- `ChatMessage { id, role, content, timestamp, status, attachments?, code? }`
- `PayloadMessage { role, content: string | ContentPart[] }`
- `LLMConfig { id, name, enabled, provider, baseUrl, apiKey, modelId, directConnect }`
- `LLMConfigStore { configs: LLMConfig[], activeId: string | null }`

### IndexedDB 架构（`src/lib/db.ts`）

DB 名 `DiagramHubDB`，Dexie 版本演进：

| 表 | 主键 | 索引 | 引入版本 |
|---|---|---|---|
| `projects` | `id` | `title, engineType, createdAt, updatedAt` | v1 |
| `versionHistory` | `id` | `projectId, timestamp` | v1 |
| `chatMessages` | `id` | `projectId, timestamp` | v2 |

删除项目时，`ProjectRepository.delete` 在单事务中同时清理 `versionHistory` 与 `chatMessages`。

### 本地存储键（localStorage）

| 键 | 内容 |
|---|---|
| `ai-draw-access-password` | 访问密码 |
| `ai-draw-llm-configs` | 自定义 LLM 配置列表 + activeId（旧键 `ai-draw-llm-config` 自动迁移） |
| `ai-draw-nexus.mermaidTheme` | Mermaid 主题选择 |
| `ai-draw-nexus.locale` | 界面语言 |

---

## 8. 多模态输入实现

| 入口 | 机制 |
|---|---|
| 粘贴 | 剪贴板文件 → 附件（图片 `image_url` / 文档 `[Document: name]`）；粘贴文本经 `looksLikeDiagramSource()` 判定，若是图表源码则由 `usePasteSource` 拦截并提议“作为新项目导入” |
| 上传 | 与粘贴共用 `toAttachment()` |
| 导入对话框 | 扩展名 → 引擎映射（`EXT_ENGINE_MAP`），校验后每文件一个项目 |
| URL | `ChatPanel` 调 `aiService.parseUrl` → `/api/parse-url` |

---

## 9. 缩略图生成

| 引擎 | 方式 |
|---|---|
| Mermaid | 渲染 SVG → canvas → PNG data URL（≤400×300，白底） |
| Excalidraw | `restoreElements` + `exportToBlob` → data URL |
| Draw.io | 无法无头生成；由 `DrawioEditor` 通过实时嵌入导出，`CanvasArea` 注册 `thumbnailGetter`，`useAIGenerate` 带重试调用 |

---

## 10. 设计系统（`src/index.css`）

- Tailwind 4 `@theme` 令牌：`brand`（`#0f172a`）、`brand-hover`（`#5753d0`）等；状态色 `success/warning/danger/info` 及 `-soft` 背景。
- 引擎强调色：Mermaid → brand，Excalidraw → warning，Draw.io → success。
- `@layer components` 共享表面类：`chip`、`surface-card`、`page-frame`、`surface-panel` 等。

---

## 11. 关键工程约定

- **路径别名**：`@/` → `src/`（`vite.config.ts` + `tsconfig.app.json`）。
- **i18n**：组件用 `useTranslation()`，纯模块用 `i18n.t()`；文案必须同时加进 `zh-CN` 与 `en-US`，保持键对齐。
- **不改硬编码文案**：用户可见字符串一律走 i18n。
- **注释与 UI 文案中英混排**：与所在文件语言保持一致。
- **`verbatimModuleSyntax`**：类型导入必须 `import type`。
