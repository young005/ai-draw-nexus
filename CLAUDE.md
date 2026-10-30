# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Diagram Hub — an AI-powered diagram creation platform. The user describes a diagram in natural
language (or uploads an image/document/URL), and AI generates it in one of three rendering engines:
Mermaid, Excalidraw, or Draw.io.

Frontend is React 19 + Vite + TypeScript + Tailwind CSS 4. Backend is Cloudflare Pages Functions
(`functions/`) acting as a thin proxy to an OpenAI-compatible or Anthropic API. All user data
(projects, version history) lives in the browser's IndexedDB via Dexie — there is no server-side DB.

## Development Commands

```bash
pnpm install

pnpm run dev            # frontend + backend together (wrangler proxies vite) → http://localhost:8787
pnpm run dev:frontend   # Vite only → http://localhost:5173
pnpm run dev:backend    # Wrangler Pages Functions only → http://localhost:8787

pnpm run build          # tsc -b && vite build (type check + build)
pnpm run lint           # ESLint
pnpm run preview        # serve production build
pnpm run pages:deploy   # build + wrangler pages deploy dist
```

**There is no test framework and no test script.** Verification is `pnpm run build` (type check) +
`pnpm run lint` + exercising the app in the browser. Note `pnpm run build` runs `tsc -b` with
`tsconfig.app.json` covering only `src/` — `functions/` is **not** type-checked by the build, so
backend type errors only surface at runtime in wrangler.

During development, hit `http://localhost:8787` (wrangler proxies to Vite) so that `/api/*` calls
resolve to the local Functions.

## Environment Setup

Backend secrets go in `.dev.vars` (root, gitignored). Frontend vars go in `.env` (also gitignored).
See `.dev.vars.example` and `.env.example`.

Backend (`functions/` reads `env`):
| Var | Purpose |
|---|---|
| `AI_API_KEY` | API key for the upstream model provider |
| `AI_BASE_URL` | Base URL, e.g. `https://api.openai.com/v1` or `https://api.anthropic.com/v1` |
| `AI_PROVIDER` | `openai` (default) or `anthropic` — selects request shape and streaming parser |
| `AI_MODEL_ID` | Model id, e.g. `gpt-5`, `claude-sonnet-4-5` |
| `ACCESS_PASSWORD` | Optional. If set, requests carrying a matching `X-Access-Password` header are quota-exempt |

Frontend (`import.meta.env.VITE_*`):
| Var | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base. Defaults to `/api` (same-origin Pages Functions). Point at a Worker URL when the backend is deployed separately |
| `VITE_DAILY_QUOTA` | Free-tier daily request cap for visitors without a password. Defaults to `10` |
| `VITE_DRAWIO_BASE_URL` | Draw.io embed origin. Defaults to `https://embed.diagrams.net` |

## Architecture

### Request path

```
User input → ChatPanel → useAIGenerate → promptBuilder → aiService → POST /api/chat
                                                                    ↓
                                            Pages Function (functions/api/chat.ts)
                                                                    ↓
                                      OpenAI-compatible OR Anthropic upstream
```

The browser never talks to the model provider directly; the Pages Function holds the API key and
translates between provider formats.

### Three parallel stores (easy to confuse)

| Store | Holds | Purpose |
|---|---|---|
| `src/stores/chatStore.ts` | `ChatMessage[]` | UI-facing message list (role, status, attachments) rendered by ChatPanel |
| `src/stores/payloadStore.ts` | `PayloadMessage[]` | The actual OpenAI-compatible request body sent to `/api/chat` |
| `src/stores/editorStore.ts` | current project + canvas content | The single source of truth for what is on the canvas |

`useAIGenerate` writes to all three: a UI message, the payload, and the editor content.

### Engine content formats

`currentContent` is a **string whose format depends on the engine**:
- `mermaid` — Mermaid source text
- `excalidraw` — JSON array of Excalidraw elements (a bare array, not `{type, elements}`)
- `drawio` — `mxGraphModel` XML

`src/lib/validators/index.ts` validates each format before the content is accepted. Mermaid is
validated with a dynamic `import('mermaid')` + `mermaid.parse()`.

### Generation and the Mermaid auto-fix loop

`src/hooks/useAIGenerate.ts` is the core orchestration:

1. Build the multimodal content (text + attachments + current canvas thumbnail as `image_url`).
2. Send with the engine's system prompt from `src/lib/prompts/`.
3. `extractCode()` (`src/lib/promptBuilder.ts`) strips markdown fences from the model reply.
4. Validate. If Mermaid fails to parse, ask the model to repair it — up to 3 attempts
   (`MAX_MERMAID_FIX_ATTEMPTS`), re-validating after each. Non-Mermaid engines have no auto-fix.
5. Write to the editor store, create a version-history entry, then regenerate the thumbnail.

The two-phase generation path (elements first, then connections) exists in `useAIGenerate` but is
currently disabled — `useTwoPhase` is hardcoded `false`, so every engine uses single-phase.

### Multimodal attachments

- Images → base64 data URLs sent as `image_url` parts.
- Documents (`.docx`/`.txt`/`.md`) → text extracted in the browser (`mammoth` for docx) and injected
  as a text part prefixed with `[Document: <name>]`.
- URLs → server-side `POST /api/parse-url` (`functions/api/parse-url.ts`), which uses
  `@mozilla/readability` + `linkedom` + `turndown` to produce markdown. Has a dedicated
  WeChat (`mp.weixin.qq.com`) preprocessing path.

### Streaming

`aiService.streamChat` consumes SSE and normalizes three provider shapes into one internal
`{ content }` JSON line format: OpenAI `choices[0].delta.content`, Anthropic
`content_block_delta`, and plain `{content}`/`{text}`. The Functions layer re-wraps upstream SSE
into that normalized format (`_shared/stream-openai.ts`, `_shared/stream-anthropic.ts`), so the
frontend only ever parses one shape.

### Quota and access password

Client-side daily quota lives in `localStorage` (`src/services/quotaService.ts`). Password holders
skip the quota. The backend independently decides exemption via `validateAccessPassword()`
(`functions/api/_shared/auth.ts`) and signals it with the `X-Quota-Exempt` response header; the
frontend consumes quota only when that header is not `true`. Quota is enforced per browser
profile, not per user.

### Thumbnails

Thumbnails are base64 data URLs stored on the project record.
- Mermaid → render to SVG → canvas → PNG data URL (`src/lib/thumbnail.ts`).
- Excalidraw → `restoreElements` + `exportToBlob` → data URL.
- Draw.io → **not** possible headlessly, so `DrawioEditor` exports via the live embed and
  `CanvasArea` registers a `thumbnailGetter` in `editorStore`; `useAIGenerate` calls it with retries
  because the embed needs time to load the new XML.

### Engine components

`src/features/engines/<engine>/` — each editor is a `forwardRef` component exposing the same
ref API (`exportAsSvg`, `exportAsPng`, `exportAsSource`, `showSourceCode`, `toggleSourceCode`).
`src/features/editor/CanvasArea.tsx` switches on `engineType` and forwards the calls. Adding a
new engine means touching: `src/types/index.ts` (`EngineType`), `src/lib/prompts/`,
`src/lib/validators/index.ts`, `src/lib/thumbnail.ts`, `src/features/engines/`, and `CanvasArea`.

Excalidraw and Draw.io editors are keyed by `projectId` so switching projects remounts them —
this prevents Excalidraw from restoring stale `localStorage` scenes.

### Version history

`versionHistory` table stores full content snapshots per project (`src/services/versionRepository.ts`).
AI generation auto-saves a version and marks content as saved (`setContentFromVersion`, which
clears `hasUnsavedChanges`). Manual engine edits only update the store — the user saves a version
explicitly from the editor toolbar.

## Deployment

Two independent deployments, described in `deploy.md`:
- **Frontend** → Cloudflare Pages, preset Vite, build `pnpm run build`, output `dist`.
- **Backend** → Cloudflare Workers (the repo's `functions/` directory; `deploy.md` refers to it as
  the `worker` root directory).

When the backend is a separate Worker, set `VITE_API_BASE_URL` to the Worker URL and redeploy the
frontend — otherwise the frontend's default `/api` base will 404 against Pages.

## Key Patterns

- **Path alias**: `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
- **Tailwind CSS 4** via the `@tailwindcss/vite` plugin; UI primitives live in `src/components/ui/`
  (Radix-based Dialog/Dropdown/Toast/Tooltip, `cn()` from `src/lib/utils.ts`).
- **Comments and UI strings are mixed Chinese/English** — match the surrounding file's language.
- **Radix components use `asChild`** where a custom trigger is needed.
- `verbatimModuleSyntax` is on: use `import type` for type-only imports.
