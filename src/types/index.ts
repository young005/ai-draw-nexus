// Engine Types
export type EngineType = 'mermaid' | 'excalidraw' | 'drawio'

// Project
export interface Project {
  id: string
  title: string
  engineType: EngineType
  thumbnail: string // Base64 string for preview
  createdAt: Date
  updatedAt: Date
}

// Version History
export interface VersionHistory {
  id: string
  projectId: string
  content: string // Source Code / JSON / XML
  changeSummary: string // "Initial" | "AI Edit" | "Manual"
  timestamp: Date
}

// Attachment types for chat messages
export interface ImageAttachment {
  type: 'image'
  dataUrl: string // Base64 data URL
  fileName: string
}

export interface DocumentAttachment {
  type: 'document'
  content: string // Extracted text content
  fileName: string
}

export interface UrlAttachment {
  type: 'url'
  content: string // Extracted markdown content
  url: string
  title: string
}

export type Attachment = ImageAttachment | DocumentAttachment | UrlAttachment

// Chat Message (UI Content Store)
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status: 'pending' | 'streaming' | 'complete' | 'error'
  avatar?: string
  attachments?: Attachment[]
  /** 助手消息生成的图表源码，可展开查看 */
  code?: string
}

// Payload Message (Message Payload Store - OpenAI compatible)
export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface PayloadMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

// 用户自定义的 LLM 配置
export interface LLMConfig {
  enabled: boolean
  provider: 'openai' | 'anthropic'
  baseUrl: string
  apiKey: string
  modelId: string
  /** 直连模式：前端直接请求 AI 服务，不经过后台代理 */
  directConnect: boolean
}

// API Request
export interface ChatRequest {
  messages: PayloadMessage[]
  stream?: boolean
  llmConfig?: LLMConfig
}
