# 应用架构（Application Architecture）

> 项目：AI Diagram Hub（`ai-draw-nexus`）
> 文档范围：应用功能域、页面与组件树、状态与数据流转、功能用例的端到端实现。
> 本文件仅为说明文档，不改动任何代码。

---

## 1. 应用功能域

| 功能域 | 说明 | 主要载体 |
|---|---|---|
| 首页快速生成 | 选引擎 + 输入描述 → 直接生成并进入编辑器 | `HomePage`、`CreateProjectDialog` |
| 项目管理 | 项目列表、创建、搜索、删除（级联清理） | `ProjectsPage`、`projectRepository` |
| 编辑器 | 画布 + 工具栏 + 聊天面板 + 版本面板 + 源码面板 | `EditorPage`、`features/editor`、`features/engines` |
| AI 生成与编辑 | 自然语言新建 / 增量修改现有图表 | `useAIGenerate`、`ChatPanel` |
| 多模态输入 | 图片、文档、URL、粘贴源码 | `fileUtils`、`ImportDialog`、`usePasteSource`、`parse-url` |
| 版本历史 | 自动/手动快照、预览、恢复 | `VersionPanel`、`versionRepository` |
| 设置 | 自定义 LLM（BYOK）、访问密码、语言 | `ProfilePage`、`LLMSettings`、`quotaService` |
| 营销页 | 产品介绍 | `LandingPage` |

---

## 2. 页面与组件树

```
App (BrowserRouter + TooltipProvider + Toaster)
├─ /                 HomePage
│                     ├─ AppHeader / AppSidebar
│                     ├─ 引擎选择 + 描述输入
│                     ├─ PasteSourceBanner（粘贴源码提示）
│                     └─ CreateProjectDialog
├─ /landing          LandingPage
├─ /projects         ProjectsPage
│                     └─ CreateProjectDialog
├─ /editor/:projectId EditorPage
│                     ├─ AppHeader / AppSidebar
│                     ├─ CanvasArea（按 engineType 分发）
│                     │    ├─ MermaidRenderer
│                     │    ├─ ExcalidrawEditor
│                     │    └─ DrawioEditor
│                     ├─ SourceCodePanel（共享 Monaco 面板）
│                     ├─ VersionPanel
│                     └─ ChatPanel
└─ /profile          ProfilePage
                      └─ LLMSettings
```

共享 UI 基元位于 `src/components/ui/`（Radix）：Button、Input、Card、Dialog、DropdownMenu、
Tooltip、Loading、Toast/Toaster，外加 `LanguageSwitcher`。

---

## 3. 状态与数据流

### 3.1 三个 Zustand store 的写入关系

```
        ┌──────────────────────── useAIGenerate ───────────────────────┐
        │                                                               │
        ▼                        ▼                        ▼            │
  chatStore                payloadStore              editorStore       │
 (UI 消息列表)           (OpenAI 兼容请求体)        (画布内容/当前项目)   │
        │                        │                        │            │
        └────────────────────────┴────────────────────────┘            │
                                 │                                      │
                    ┌────────────┴─────────────┐                       │
                    ▼                          ▼                       │
            Dexie (IndexedDB)            localStorage                  │
        projects/versionHistory/     配额/密码/LLM配置/主题/语言         │
              chatMessages                                             │
```

- 用户输入 → `chatStore.addMessage`（用户消息**立即**持久化）。
- 生成过程 → `payloadStore.setMessages`（真实请求体）+ `aiService.streamChat`。
- 生成成功 → `editorStore.setContentFromVersion`（画布）+ `versionRepository.create`（快照）+
  `chatStore.saveMessage`（持久化助手消息）+ 缩略图写回项目。
- 流式过程中 `chatStore.updateMessage` **不持久化**（避免每 chunk 写库造成抖动）。

### 3.2 聊天持久化语义（重要）

`chatStore` 的写入时机设计：
- `addMessage`：用户消息立即写库（携带附件）。
- `updateMessage`：**不**写库（每 chunk 触发）。
- `saveMessage(id)`：助手消息仅在生成结束（成功或错误）时写库。
- `clearMessages`（新建会话）：同时删除该项目已存记录。
- `setActiveProject(projectId)`：加载项目历史；`EditorPage` 在 `ChatPanel` 挂载前 await，避免会话闪现空白。

**后果**：生成中途刷新页面会丢失未完成的助手消息，但保留用户消息。

### 3.3 项目删除的级联

`ProjectRepository.delete` 在单个 Dexie 事务中同时删除：
该项目本身 + `versionHistory` 中该项目所有记录 + `chatMessages` 中该项目所有记录。

---

## 4. 关键用例的端到端实现

### 4.1 首次生成（首页快速生成）

```
HomePage 输入描述 + 选引擎
  → CreateProjectDialog 建项目（engineType/title）
  → 跳转 /editor/:projectId
  → EditorPage 加载项目与最新版本，setActiveProject 加载聊天
  → chatStore.setInitialPrompt(描述)
  → ChatPanel 挂载读取 initialPrompt → useAIGenerate.generate(desc, isInitial=true)
  → 系统提示词 + 流式生成 → 校验 → 画布 + 版本 + 聊天 + 缩略图
```

### 4.2 增量编辑（在已有画布上继续）

- `generate(input, isInitial=false)` 走 `buildEditPrompt`，并把**当前画布缩略图**作为 `image_url`
  一起发给模型，使模型具备“空间感知”，减少连线穿模。
- 生成完成后新建一个版本快照（`changeSummary` 为 `ai.changeSummaryEdit`）。

### 4.3 手动编辑与保存

- Excalidraw / Draw.io 的编辑只更新 `editorStore`（置 `hasUnsavedChanges`）。
- `setContent` 通过与 `lastSavedContent` 比对设置未保存标志。
- 用户在编辑器工具栏显式保存：`VersionRepository.create` + `markAsSaved`（清标志、`versionSaveCount+1`）；
  Draw.io 通过 `canvasRef.getThumbnail()` 刷新缩略图。

### 4.4 版本恢复

- `VersionPanel` 列出历史版本（`versionRepository`）。
- 选择某版本 → 预览 → “恢复” → `editorStore.setContentFromVersion(content)`（清除未保存标志）。

### 4.5 导入（文件 / 粘贴 / URL）

| 入口 | 流程 |
|---|---|
| 导入对话框 | 文件扩展名 → `EXT_ENGINE_MAP` 推断引擎 → 校验 → `importService.importDiagramAsProject`（每文件一个项目 + 首个版本） |
| 粘贴源码 | 剪贴板文本经 `looksLikeDiagramSource()` 判定 → `PasteSourceBanner` 提议“作为新项目导入” |
| URL | `ChatPanel` 调 `aiService.parseUrl` → 后端抽取正文 → 作为文本附件参与生成 |

### 4.6 缩略图

| 引擎 | 机制 |
|---|---|
| Mermaid | 渲染 SVG → canvas → PNG data URL（≤400×300，白底） |
| Excalidraw | `restoreElements` + `exportToBlob` → data URL |
| Draw.io | 无头不可生成；`DrawioEditor` 经实时嵌入导出，`CanvasArea` 注册 `thumbnailGetter`，`useAIGenerate` 重试 3 次 @500ms |

---

## 5. 引擎抽象（可扩展点）

`src/features/engines/<engine>/` 下每个编辑器都是 `forwardRef` 组件，暴露统一 ref API：

```
exportAsSvg()  exportAsPng()  exportAsSource()
showSourceCode()  hideSourceCode()  toggleSourceCode()
```

`CanvasArea` 依据 `engineType` 分发，并额外暴露 `getThumbnail()`。

**新增引擎需改动的位置**：
`src/types/index.ts`（`EngineType`）、`src/lib/prompts/`、`src/lib/validators/index.ts`、
`src/lib/thumbnail.ts`、`src/features/engines/`、`CanvasArea`。

---

## 6. 设置域（BYOK / 配额 / 语言）

- **自定义 LLM 配置**（`LLMSettings` + `quotaService`）：支持多个 profile，
  `{id, name, enabled, provider, baseUrl, apiKey, modelId, directConnect}` + `activeId`。
  旧单配置键 `ai-draw-llm-config` 在首次读取时自动迁移。
- **两种模式**（`buildAuthContext()`）：
  - 代理模式 → `/api/chat` 带 `X-Custom-LLM: true` 并把配置放请求体，后端用 `resolveLlmSettings` 解析。
  - 直连模式 → 浏览器直接调 `{baseUrl}/chat/completions` 或 `{baseUrl}/messages`（可能受 CORS 限制）。
- **探测**（`llmProbe.ts`）：按 profile 模式直连或走 `/api/llm`；失败经 `llmErrors.ts` 归一化，
  UI 能提示具体原因（错 key / 未知模型 / 错 baseUrl / 限流 / CORS）。
- **配额与密码**：`VITE_DAILY_QUOTA`（默认 10）前端强制；`ACCESS_PASSWORD` 或有效自定义配置 → 配额豁免。
- **语言**：`LanguageSwitcher` + i18next，检测顺序 localStorage → navigator，回退 zh-CN。

---

## 7. 国际化结构

- 单命名空间 `translation`，资源 `{ 'zh-CN': …, 'en-US': … }`。
- 25 个顶层命名空间：`common, locale, app, nav, header, engines, quickActions, home, projects,
  createDialog, importDialog, editor, chat, versionPanel, sourceCodePanel, mermaidRenderer,
  excalidrawEditor, drawioEditor, profile, ai, errors, landing, toast, llm, paste`。
- 每语言约 445 个叶子键，两语言键必须对齐。
- 组件用 `useTranslation()`；纯模块（`fileUtils`、`aiService`、`quotaService`、`llmErrors`、
  `importService`、`useToast`）用 `i18n.t()`。

---

## 8. 应用层约束

- **不硬编码用户可见字符串**：新增文案须同时加入 `zh-CN` 与 `en-US`。
- **Draw.io / Excalidraw 编辑器以 `projectId` 为 key**：切换项目强制重挂载，避免 Excalidraw 恢复过期 localStorage 场景。
- **两阶段生成被禁用**：`useAIGenerate` 中 `useTwoPhase = false`，全部走单阶段。
- **Mermaid 自动修复上限 3 次**：`MAX_MERMAID_FIX_ATTEMPTS`，非 Mermaid 引擎无自动修复。
- **AI 生成自动存版本**：`setContentFromVersion` 会清除 `hasUnsavedChanges`；手动编辑不自动存版本。

---

## 9. 相关文档

- 系统架构：`01-system-architecture.md`
- 技术架构：`02-technical-architecture.md`
- 部署架构：`03-deployment-architecture.md`
