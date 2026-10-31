import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, Attachment } from '@/types'
import { ChatRepository } from '@/services/chatRepository'

interface ChatState {
  // UI messages for display
  messages: ChatMessage[]
  // 当前会话所属项目（聊天记录按项目保存在本地）
  projectId: string | null
  // Initial prompt from Quick Start (Path A)
  initialPrompt: string | null
  // Initial attachments from Quick Start (Path A)
  initialAttachments: Attachment[] | null
  // Streaming state
  isStreaming: boolean

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, data: Partial<ChatMessage>) => void
  clearMessages: () => void
  removeMessage: (id: string) => void
  setActiveProject: (projectId: string) => Promise<void>
  saveMessage: (id: string) => Promise<void>
  setInitialPrompt: (prompt: string | null, attachments?: Attachment[] | null) => void
  clearInitialPrompt: () => void
  setStreaming: (streaming: boolean) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  projectId: null,
  initialPrompt: null,
  initialAttachments: null,
  isStreaming: false,

  addMessage: (message) => {
    const id = uuidv4()
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    }
    set((state) => ({
      messages: [...state.messages, newMessage],
    }))

    // 用户消息（含图片等附件）立即落库；助手消息等生成结束再存
    const projectId = get().projectId
    if (projectId && newMessage.role === 'user') {
      void ChatRepository.save({ ...newMessage, projectId }).catch((err) => {
        console.error('Failed to save chat message:', err)
      })
    }

    return id
  },

  updateMessage: (id, data) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...data } : msg
      ),
    }))
  },

  clearMessages: () => {
    const projectId = get().projectId
    set({ messages: [] })
    if (projectId) {
      void ChatRepository.deleteByProject(projectId).catch((err) => {
        console.error('Failed to clear chat history:', err)
      })
    }
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    }))
    void ChatRepository.delete(id).catch((err) => {
      console.error('Failed to remove chat message:', err)
    })
  },

  setActiveProject: async (projectId) => {
    set({ projectId, messages: [] })
    try {
      const stored = await ChatRepository.getByProject(projectId)
      // 载入期间可能已经切到别的项目了，此时丢弃结果
      if (get().projectId !== projectId) return
      set({ messages: stored })
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
  },

  saveMessage: async (id) => {
    const { messages, projectId } = get()
    if (!projectId) return
    const message = messages.find((msg) => msg.id === id)
    if (!message) return
    try {
      await ChatRepository.save({ ...message, projectId })
    } catch (err) {
      console.error('Failed to save chat message:', err)
    }
  },

  setInitialPrompt: (prompt, attachments) => set({ initialPrompt: prompt, initialAttachments: attachments ?? null }),

  clearInitialPrompt: () => set({ initialPrompt: null, initialAttachments: null }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
}))
