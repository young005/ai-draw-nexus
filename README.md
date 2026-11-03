# AI Diagram Hub

An AI-powered diagram creation platform. Describe your diagram in natural language, and AI generates it for you.

Built on Cloudflare Pages with React frontend and Pages Functions backend.

## Key Highlights

### Three Drawing Engines

Three distinctive drawing engines to meet different needs:

- **Mermaid** - Flowcharts, sequence diagrams, class diagrams - code-driven, precise control
- **Excalidraw** - Hand-drawn style diagrams, clean and beautiful, great for brainstorming
- **Draw.io** - Professional diagram editor, feature-rich, ideal for complex diagrams

### Intuitive Project Management

- Easily manage all your diagram projects
- Complete version history, restore to any previous version
- **All data stored locally** - no privacy concerns

### Superior Drawing Experience

- **Instant Response** - Almost all diagrams render in seconds, no more waiting
- **Beautiful Styling** - Specially optimized Mermaid rendering for significantly improved aesthetics
- **Smart Editing** - Continue editing based on existing diagrams, AI understands context
- **Spatial Awareness** - Better layout capabilities, fewer arrows crossing through elements

### Multimodal Input

Beyond text descriptions, also supports:

- **Document Visualization** - Upload documents to auto-generate visual diagrams
- **Image Recreation** - Upload images, AI recognizes and recreates diagrams
- **Link Parsing** - Enter URLs to auto-parse content and generate diagrams

### Paste, Don't Upload

The input box accepts what you paste, not just what you pick:

- **Paste a screenshot** - `Ctrl+V` an image straight into the chat or the homepage composer
- **Paste a document** - dropped in as text the model can read
- **Paste diagram source** - Mermaid / Draw.io / Excalidraw code is detected and offered as
  "import as a new project" instead of being sent as a message
- **Import files** - `.mmd`, `.mermaid`, `.txt`, `.excalidraw`, `.json`, `.drawio`, `.xml`; the
  engine is detected from the file extension

### Your Own Model

Bring your own API key instead of using the site's:

- Save **several profiles** (DeepSeek, MiniMax, Qwen, GLM, OpenRouter, Ollama, ...) and switch
  between them at any time
- Presets fill in the endpoint and API type for you; **Load Models** fetches the full list from
  the provider's `/models` endpoint
- **Test Connection** tells you exactly what went wrong - wrong key, unknown model, wrong base
  URL, rate limit, or a CORS block
- Proxy mode forwards through the backend, direct mode talks to the provider from the browser
- With a custom profile the requests are billed to your own provider - the site keeps no count

### Bilingual & Local-First

- Chinese and English UI, switchable at any time
- Projects, version history **and chat transcripts** (including pasted images) are stored in your
  browser's IndexedDB - nothing is uploaded

## Quick Start

### Option 1: Quick Generate from Homepage

1. Open the homepage
2. Select a drawing engine (Mermaid / Excalidraw / Draw.io)
3. Enter your diagram description, e.g., "Draw a user login flowchart"
4. Click Generate - AI creates the project and diagram automatically

### Option 2: Project Management

1. Go to the Projects page
2. Click "New Project"
3. Choose an engine and name your project
4. Use the chat panel in the editor to describe your needs

## Usage Tips

### AI Chat Generation

In the chat panel on the right side of the editor, you can:

- Describe new diagrams: "Draw an e-commerce checkout flow"
- Modify existing diagrams: "Change the payment node to red"
- Add elements: "Add an inventory check step"

### Manual Editing

- **Excalidraw** - Drag and draw directly on the canvas
- **Draw.io** - Use professional diagram editing tools
- **Mermaid** - Edit the code directly

### Version Management

- Click the "History" button in the toolbar
- View all historical versions
- Click any version to preview
- Click "Restore" to revert to that version

### Chat History

- Every conversation is saved per project in your browser and restored on reload
- Pasted images stay with their message
- "New conversation" clears the stored transcript, not just the visible one

### Custom LLM Profiles

Open **Settings** in the sidebar:

1. Pick a provider preset (or type a custom endpoint)
2. Enter the API key, then **Load Models** to pick from the provider's list - or type the model ID
3. **Test Connection** to confirm the key, endpoint and model all work
4. Save, then use "Use this one" to switch the active profile

## Local Development

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/hkxiaoyao/ai-draw-nexus
cd ai-draw-nexus
pnpm install
```

<details>
<summary>Using the tarball instead of git clone</summary>

```bash
tar -xzf ai-draw-nexus.tar.gz
cd ai-draw-nexus
pnpm install
cp .dev.vars.example .dev.vars   # fill in your API key
pnpm run dev
```

</details>

### 2. Configure Environment Variables

Create a `.dev.vars` file in the root directory:

```env
AI_API_KEY=your-api-key
AI_BASE_URL=https://api.openai.com/v1
AI_PROVIDER=openai
AI_MODEL_ID=gpt-4o-mini
```

> Supports OpenAI, Anthropic, and other OpenAI-compatible services
>
> Optional: `ACCESS_PASSWORD` - if set, a request that carries the header must present the
> correct value. There is no daily request cap.

### 3. Start Development Server

```bash
# Start frontend + backend together
pnpm run dev
# Visit http://localhost:8787

# Or run separately:
pnpm run dev:frontend   # Vite only (http://localhost:5173)
pnpm run dev:backend    # Wrangler Pages only (http://localhost:8787)
```

**Note**: Access `http://localhost:8787` during development (wrangler proxies vite).

## Cloudflare Pages Deployment

### 1. Build

```bash
pnpm run build        # TypeScript check + Vite build
```

### 2. Configure Production Secrets

```bash
wrangler pages secret put AI_API_KEY
wrangler pages secret put AI_BASE_URL
wrangler pages secret put AI_PROVIDER
wrangler pages secret put AI_MODEL_ID
```

Or configure environment variables in Cloudflare Pages dashboard.

### 3. Deploy

```bash
pnpm run pages:deploy
```

### Supported AI Services

| Provider | AI_PROVIDER | AI_BASE_URL | Recommended Models |
|----------|-------------|-------------|-------------------|
| OpenAI | openai | https://api.openai.com/v1 | gpt-5 |
| Anthropic | anthropic | https://api.anthropic.com/v1 | claude-sonnet-4-5 |
| Other compatible | openai | Custom URL | - |

## Tech Stack

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS 4
- i18n: i18next + react-i18next (zh-CN / en-US)
- State: Zustand
- Storage: Dexie.js (IndexedDB) - projects, version history, chat transcripts
- Backend: Cloudflare Pages Functions (`/api/chat`, `/api/llm`, `/api/parse-url`)

## License

MIT
