# 部署架构（Deployment Architecture）

> 项目：AI Diagram Hub（`ai-draw-nexus`）
> 文档范围：部署拓扑、环境配置、构建流程、CI/CD 与运维要点。
> 本文件仅为说明文档，不改动任何代码。

---

## 1. 部署拓扑

系统由**两个相互独立的 Cloudflare 部署**组成：

```
                    ┌───────────────────────────────────────┐
   浏览器  ────────▶│  Cloudflare Pages（前端静态资源）        │
                    │  构建：pnpm run build → dist/           │
                    │  React SPA，CDN 分发                    │
                    └───────────────┬───────────────────────┘
                                    │  /api/*（VITE_API_BASE_URL 指向 Worker）
                                    ▼
                    ┌───────────────────────────────────────┐
                    │  Cloudflare Workers（后端 functions/）  │
                    │  Pages Functions 约定，onRequest* 路由  │
                    └───────────────┬───────────────────────┘
                                    │  服务端密钥 / 用户自带密钥
                                    ▼
                    ┌───────────────────────────────────────┐
                    │  OpenAI 兼容 API 或 Anthropic API       │
                    └───────────────────────────────────────┘
```

要点：
- 前端是纯静态 SPA（Vite 构建产物 `dist/`），由 Pages 的 CDN 分发。
- 后端是 Cloudflare Workers 上的 `functions/` 目录（Pages Functions 约定：基于文件的路由，导出 `onRequest*`）。
- 两个部署独立，需通过 `VITE_API_BASE_URL` 把前端指向后端 Worker URL；否则前端默认 `/api` 同源基址会在 Pages 上 404。
- **无服务端数据库**：未绑定 D1 / KV / R2 / Durable Objects，用户数据全在浏览器本地。

---

## 2. 生产部署方式

`deploy.md`（中文）描述的推荐方式是**通过 GitHub 自动部署**：

### 2.1 前端 → Cloudflare Pages

1. Dashboard → Workers & Pages → Create → Pages → Connect to Git → 选择仓库 `ai-draw-nexus`。
2. 框架预设 **Vite**，构建命令 `pnpm run build`，输出目录 `dist`。
3. 可选环境变量 `VITE_API_BASE_URL` = 后端 Worker URL。
4. 保存并部署。

### 2.2 后端 → Cloudflare Workers

1. Workers & Pages → Create → Workers → Connect to Git（同一仓库）。
2. 根目录为 `worker`（注意：`deploy.md` 写作 `worker`，实际仓库目录为 `functions/`；`CLAUDE.md` 已明确后端目录即 `functions/`）。
3. 构建命令可留空。
4. 部署后，在 Worker → Settings → Variables and Secrets 添加：
   - `AI_PROVIDER`（`openai` | `anthropic`）
   - `AI_BASE_URL`（如 `https://api.openai.com/v1`）
   - `AI_API_KEY`
   - `AI_MODEL_ID`（如 `gpt-5`）

### 2.3 部署后

- 前端地址：`https://ai-draw-nexus.pages.dev`
- Worker 地址：`https://ai-draw-nexus-worker.<account>.workers.dev`
- 将 Worker URL 填入 Pages 的环境变量 `VITE_API_BASE_URL`，重新部署前端。

### 2.4 自定义域名

在 Cloudflare 中按项目添加 Custom domains。

---

## 3. CLI 部署方式

仓库提供脚本（见 `package.json`）：

| 命令 | 作用 |
|---|---|
| `pnpm run build` | `tsc -b && vite build`（类型检查 + 构建到 `dist/`） |
| `pnpm run pages:deploy` | `pnpm run build && wrangler pages deploy dist`（CLI 直连部署 Pages） |

后端密钥也可通过 CLI 设置：

```bash
wrangler pages secret put AI_API_KEY
wrangler pages secret put AI_BASE_URL
wrangler pages secret put AI_PROVIDER
wrangler pages secret put AI_MODEL_ID
```

> 说明：仓库中**不存在 `wrangler.toml` / `wrangler.jsonc`**。本地后端由 `dev:backend` 脚本以 CLI 参数启动，生产配置通过 Cloudflare Dashboard 或上述 CLI 完成。

---

## 4. 环境变量与密钥

### 4.1 后端（`functions/` 读取 `env`）

| 变量 | 用途 |
|---|---|
| `AI_API_KEY` | 上游模型服务的 API Key |
| `AI_BASE_URL` | 上游基址，如 `https://api.openai.com/v1` 或 `https://api.anthropic.com/v1` |
| `AI_PROVIDER` | `openai`（默认）或 `anthropic`，决定请求形状与流式解析器 |
| `AI_MODEL_ID` | 模型 id，如 `gpt-5`、`claude-sonnet-4-5` |
| `ACCESS_PASSWORD` | 可选。设置后，携带 `X-Access-Password` 头的请求必须提供正确密码 |

本地开发时写入根目录 `.dev.vars`（gitignore）。仓库只跟踪 `.dev.vars.example`：

```env
AI_API_KEY=你的密钥
AI_BASE_URL=https://api.openai.com/v1
AI_PROVIDER=openai
AI_MODEL_ID=gpt-5
```

### 4.2 前端（`import.meta.env.VITE_*`）

| 变量 | 用途 |
|---|---|
| `VITE_API_BASE_URL` | API 基址，默认 `/api`（同源 Pages Functions）。后端独立部署为 Worker 时指向 Worker URL |
| `VITE_DRAWIO_BASE_URL` | Draw.io 嵌入源，默认 `https://embed.diagrams.net` |

本地写入 `.env`（gitignore）。只跟踪 `.env.example`：

```env
VITE_API_BASE_URL=/api
```

> 注意：`VITE_DRAWIO_BASE_URL` 代码支持但未列入 `.env.example`；`ACCESS_PASSWORD` 代码支持但未列入 `deploy.md` 密钥表。

---

## 5. 构建与本地运行

### 5.1 脚本

| 命令 | 说明 |
|---|---|
| `pnpm install` | 安装依赖 |
| `pnpm run dev` | 前后端同时启动（wrangler 代理 vite）→ `http://localhost:8787` |
| `pnpm run dev:frontend` | 仅 Vite → `http://localhost:5173` |
| `pnpm run dev:backend` | 仅 wrangler Pages Functions → `http://localhost:8787` |
| `pnpm run build` | `tsc -b && vite build`（类型检查 + 构建） |
| `pnpm run lint` | ESLint |
| `pnpm run preview` | 预览生产构建 |
| `pnpm run pages:deploy` | 构建 + `wrangler pages deploy dist` |

本地后端命令：`wrangler pages dev --compatibility-date=2024-01-01 --proxy=5173`
- `--proxy=5173`：把非 `/api/*` 请求代理到 Vite。
- `--compatibility-date=2024-01-01`：唯一的兼容性日期来源（无 wrangler 配置文件）。

开发期间请访问 `http://localhost:8787`（wrangler 反向代理到 Vite），使 `/api/*` 命中本地 Functions。
若 8787 被占用，wrangler 会选下一个空闲端口，读取 dev server 输出的 “Ready on http://127.0.0.1:PORT”。

### 5.2 构建期类型检查范围（重要）

- `pnpm run build` 执行 `tsc -b`，`tsconfig.app.json` **只 include `src/`**。
- `functions/` **不在构建期类型检查内**，后端类型错误只在 wrangler 运行时暴露。
- `eslint.config.js` 忽略 `dist` 与 `.wrangler`。
- `pnpm run lint` 存在约 22 个既有基线问题（多为引擎组件中的 `any` / exhaustive-deps），不应增加。

---

## 6. 运行时特性与运维要点

- **CORS**：`_shared/cors.ts` 允许任意来源（`Allow-Origin: *`），方法 GET/POST/OPTIONS，允许头 `Content-Type, X-Access-Password, X-Custom-LLM`。
- **流式**：后端把上游 SSE 归一化为统一 `{content}` 形状（`text/event-stream`），前端只解析一种形状。
- **SSRF 防护**：`/api/llm` 拒绝 loopback、`*.local`/`*.internal`、`0.0.0.0`、IPv6 `fc/fd/fe80`、私网 IPv4 段及非 http(s) 协议。
- **密钥安全**：后端**不记录请求体**（可能含用户 API Key）。
- **无状态后端**：Workers 不保存任何会话/数据，可水平扩展。

---

## 7. 部署核对清单

- [ ] 后端 Worker 已配置 `AI_PROVIDER` / `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL_ID`（如需访客密码再加 `ACCESS_PASSWORD`）。
- [ ] 前端 Pages 已配置 `VITE_API_BASE_URL` 指向后端 Worker URL。
- [ ] 后端独立部署时，前端默认 `/api` 基址会 404 —— 必须改用 Worker URL 并重新部署。
- [ ] 后端根目录确认为 `functions/`（`deploy.md` 中的 `worker` 为历史命名）。
- [ ] 自定义域名（如需）已在 Cloudflare 中配置。

---

## 8. 已知文档差异（记录，供后续修订）

| 项 | 现状 |
|---|---|
| 后端目录名 | `deploy.md` 写 `worker`，实际为 `functions/`（`CLAUDE.md` 已澄清） |
| wrangler 配置 | 无 `wrangler.toml`/`wrangler.jsonc`，仅 CLI 参数 + Dashboard |
| CLI 部署 | 仓库提供 `pages:deploy`，`deploy.md` 未提及 |
| `ACCESS_PASSWORD` | 代码支持，`deploy.md` 密钥表未列出 |
| `VITE_DRAWIO_BASE_URL` | 代码支持，`.env.example` 未列出 |
| i18n 键数量 | 实测每语言 25 个命名空间、445 个叶子键；`CLAUDE.md` 的 373 为旧值 |
