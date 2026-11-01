# 架构文档索引（Architecture Docs）

AI Diagram Hub（`ai-draw-nexus`）架构说明文档集。本目录为纯文档，不包含代码改动。

| 文档 | 内容 |
|---|---|
| [01-system-architecture.md](./01-system-architecture.md) | 系统架构：系统定位、逻辑组成、角色职责、端到端数据流、三种运行模式、关键约束 |
| [02-technical-architecture.md](./02-technical-architecture.md) | 技术架构：技术栈、分层、前端/后端模块、接口、数据模型、生成与自动修复机制、设计系统 |
| [03-deployment-architecture.md](./03-deployment-architecture.md) | 部署架构：部署拓扑、Pages/Workers 部署步骤、环境变量密钥、构建流程、运维要点、核对清单 |
| [04-application-architecture.md](./04-application-architecture.md) | 应用架构：功能域、页面与组件树、状态与数据流转、关键用例端到端实现、引擎抽象、设置与 i18n |

## 一句话概览

React 19 + Vite 前端（三渲染引擎），Cloudflare Pages Functions 后端（薄代理），
用户数据全存浏览器 IndexedDB（Dexie），后端仅转发至 OpenAI 兼容 / Anthropic 上游。

## 阅读建议

- 想快速了解整体 → 先读 `01`。
- 要改代码 / 加引擎 → 读 `02` + `04`。
- 要上线 / 配环境 → 读 `03`。
