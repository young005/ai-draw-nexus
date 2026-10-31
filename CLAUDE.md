# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Diagram Hub — an AI-powered diagram creation platform. The user describes a diagram in natural
language (or pastes an image / document / diagram source / URL), and AI generates it in one of three
rendering engines: Mermaid, Excalidraw, or Draw.io.

Frontend is React 19 + Vite + TypeScript + Tailwind CSS 4 + i18next. Backend is Cloudflare Pages
Functions (`functions/`) acting as a thin proxy to an OpenAI-compatible or Anthropic API. All user
data (projects, version history, chat history) lives in the browser's IndexedDB via Dexie — there is
no server-side DB.

The UI mirrors the deployed reference build (ai-draw-nexus.aizhi.site): same copy deck, same design
tokens, same feature set. Copy lives in `src/i18n/locales/{zh-CN,en-US}.ts` (25 namespaces, 373 keys
each) — **never hardcode user-facing strings**, add a key to both locales instead.

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

`pnpm run lint` has a pre-existing baseline of ~22 problems (mostly `any`/exhaustive-deps in the
engine components); don't raise that number. `eslint.config.js` ignores `dist` and `.wrangler`.

During development, hit `http://localhost:8787` (wrangler proxies to Vite) so that `/api/*` calls
resolve to the local Functions. If 8787 is taken, wrangler picks the next free port — read the
"Ready on http://127.0.0.1:PORT" line from the dev server output.

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

The browser never talks to the model provider directly *unless* the user enabled a custom LLM in
direct-connect mode (see BYOK below).

### Routes

`/` app home · `/landing` marketing page · `/projects` project list · `/editor/:projectId` editor ·
`/profile` settings. Unmatched paths redirect to `/` (catch-all route). Defined in `src/App.tsx`.

### Three parallel stores (easy to confuse)

| Store | Holds | Purpose |
|---|---|---|
| `src/stores/chatStore.ts` | `ChatMessage[]` | UI-facing message list (role, status, attachments, generated `code`) |
| `src/stores/payloadStore.ts` | `PayloadMessage[]` | The actual OpenAI-compatible request body sent to `/api/chat` |
| `src/stores/editorStore.ts` | current project + canvas content | The single source of truth for what is on the canvas |

`useAIGenerate` writes to all three: a UI message, the payload, and the editor content.

### Engine content formats

`currentContent` is a **string whose format depends on the engine**:
- `mermaid` — Mermaid source text
- `excalidraw` — JSON array of Excalidraw elements (a bare array, not `{type, elements}`)
- `drawio` — `mxGraphModel` XML

`src/lib/validators/index.ts` validates each format before the content is accepted. Mermaid is
validated with a dynamic `import('mermaid')` + `mermaid.parse()`. The same validator gates imports.

### Generation and the Mermaid auto-fix loop

`src/hooks/useAIGenerate.ts` is the core orchestration:

1. Build the multimodal content (text + attachments + current canvas thumbnail as `image_url`).
2. Send with the engine's system prompt from `src/lib/prompts/`.
3. `extractCode()` (`src/lib/promptBuilder.ts`) strips markdown fences from the model reply.
4. Validate. If Mermaid fails to parse, ask the model to repair it — up to 3 attempts
   (`MAX_MERMAID_FIX_ATTEMPTS`), re-validating after each. Non-Mermaid engines have no auto-fix.
5. Write to the editor store, create a version-history entry, store the code on the assistant
   message (so the chat can show it), then regenerate the thumbnail.

The two-phase generation path (elements first, then connections) exists in `useAIGenerate` but is
currently disabled — `useTwoPhase` is hardcoded `false`, so every engine uses single-phase.

### Multimodal input: paste, upload, import

- **Paste** (`onPaste` on the chat and home textareas): files in the clipboard become attachments
  (image → `image_url` part, document → `[Document: name]` text part). Pasted *text* is sniffed by
  `looksLikeDiagramSource()` in `src/lib/fileUtils.ts`; if it looks like Mermaid/Draw.io/Excalidraw
  source, `usePasteSource` intercepts it and offers "import as a new project" instead of sending it
  as a message.
- **Upload**: same conversion path via `toAttachment()` — one implementation, two entry points.
- **Import dialog** (`src/features/project/ImportDialog.tsx`): file upload or pasted text; engine is
  detected from the file extension (`EXT_ENGINE_MAP`), content is validated, one project per file.

### Streaming

`aiService.streamChat` consumes SSE and normalizes provider shapes into one internal `{ content }`
format: OpenAI `choices[0].delta.content`, Anthropic `content_block_delta`, plus plain
`{content}`/`{text}`. The Functions layer re-wraps upstream SSE into that same format
(`_shared/stream-openai.ts`, `_shared/stream-anthropic.ts`), so the frontend parses only one shape.

### Quota, access password, and custom LLM (BYOK)

All three live in `src/services/quotaService.ts` and localStorage:
- Daily quota (`ai-draw-quota`) — enforced client-side.
- Access password (`ai-draw-access-password`) — skips the quota.
- Custom LLM config (`ai-draw-llm-config`) — `{enabled, provider, baseUrl, apiKey, modelId, directConnect}`.

The custom LLM has two modes (`buildAuthContext()` in `src/services/aiService.ts`):
- **Proxy mode** — request goes to `/api/chat` with header `X-Custom-LLM: true` and the config in
  the request body; the backend resolves it over env vars (`resolveLlmSettings()` in
  `functions/api/_shared/types.ts`).
- **Direct mode** — the browser calls the provider itself (`{baseUrl}/chat/completions` or
  `{baseUrl}/messages`); nothing goes through the backend.

A valid custom config takes priority over the access password. The backend never logs request
bodies (they may contain user API keys).

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
`src/features/editor/CanvasArea.tsx` switches on `engineType` and forwards the calls. The source-code
editor is shared: `src/features/editor/SourceCodePanel.tsx` (Monaco + copy/reset/apply).

Adding a new engine means touching: `src/types/index.ts` (`EngineType`), `src/lib/prompts/`,
`src/lib/validators/index.ts`, `src/lib/thumbnail.ts`, `src/features/engines/`, and `CanvasArea`.

Excalidraw and Draw.io editors are keyed by `projectId` so switching projects remounts them —
this prevents Excalidraw from restoring stale `localStorage` scenes.

### Mermaid themes

Five themes live in `src/lib/mermaidThemes.ts` (Notion / Minimal / Hand Drawn / Material / Playful
Doodle), each with `themeVariables` plus extra `themeCSS` injected into the rendered SVG. The
selection persists in localStorage (`ai-draw-nexus.mermaidTheme`); the picker is in the Mermaid
toolbar.

### Version history

`versionHistory` table stores full content snapshots per project (`src/services/versionRepository.ts`).
AI generation auto-saves a version and marks content as saved (`setContentFromVersion`, which
clears `hasUnsavedChanges`). Manual engine edits only update the store — the user saves a version
explicitly from the editor toolbar.

### Chat history persistence

The chat transcript is stored **per project** in the `chatMessages` table (`src/services/chatRepository.ts`),
including image attachments (base64 data URLs, same representation as project thumbnails).

`src/stores/chatStore.ts` owns the writes:
- `addMessage` persists **user** messages immediately (they carry the attachments).
- Assistant messages are persisted by `saveMessage(id)` only once generation finishes
  (`src/hooks/useAIGenerate.ts` calls it on success and on error). `updateMessage` deliberately
  does *not* persist — it runs on every stream chunk, and writing each chunk to IndexedDB would
  thrash the database. A reload mid-generation therefore loses the unfinished assistant message
  but keeps the user's.
- `clearMessages` (the "new conversation" button) also deletes the project's stored rows;
  `removeMessage` deletes a single row.
- `setActiveProject(projectId)` loads a project's history; `EditorPage` awaits it before the chat
  panel mounts so the transcript doesn't flash empty.

Deleting a project cascades: `ProjectRepository.delete` removes its version history *and* chat rows
in one transaction.

## Design System

`src/index.css` holds the Tailwind 4 `@theme` block (colors, fonts, shadows) and a `@layer
components` block with the shared surface classes (`chip`, `surface-card`, `page-frame`, …).
Colors are slate/neutral based with `brand` = near-black `#0f172a` and `brand-hover` = `#5753d0`;
status colors are `success` / `warning` / `danger` / `info` with matching `-soft` backgrounds.
Engine accents: Mermaid → brand, Excalidraw → warning, Draw.io → success.

## Key Patterns

- **Path alias**: `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
- **Tailwind CSS 4** via the `@tailwindcss/vite` plugin; UI primitives live in `src/components/ui/`
  (Radix-based Dialog/Dropdown/Toast/Tooltip, `cn()` from `src/lib/utils.ts`).
- **i18n**: `useTranslation()` from `react-i18next` in components; `i18n.t()` in plain modules
  (`fileUtils`, `aiService`, `quotaService`). Locale files must stay key-aligned.
- **Comments and UI strings are mixed Chinese/English** — match the surrounding file's language.
- **Radix components use `asChild`** where a custom trigger is needed.
- `verbatimModuleSyntax` is on: use `import type` for type-only imports.

## Deployment

Two independent deployments, described in `deploy.md`:
- **Frontend** → Cloudflare Pages, preset Vite, build `pnpm run build`, output `dist`.
- **Backend** → Cloudflare Workers (the repo's `functions/` directory; `deploy.md` refers to it as
  the `worker` root directory).

When the backend is a separate Worker, set `VITE_API_BASE_URL` to the Worker URL and redeploy the
frontend — otherwise the frontend's default `/api` base will 404 against Pages.
