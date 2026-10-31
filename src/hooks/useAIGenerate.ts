import { useChatStore } from '@/stores/chatStore'
import { useEditorStore, selectIsEmpty } from '@/stores/editorStore'
import { usePayloadStore } from '@/stores/payloadStore'
import { VersionRepository } from '@/services/versionRepository'
import { ProjectRepository } from '@/services/projectRepository'
import {
  SYSTEM_PROMPTS,
  buildInitialPrompt,
  buildEditPrompt,
  extractCode,
} from '@/lib/promptBuilder'
import { generateThumbnail } from '@/lib/thumbnail'
import { aiService } from '@/services/aiService'
import { validateContent } from '@/lib/validators'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from 'react-i18next'
import type { PayloadMessage, EngineType, Attachment, ContentPart } from '@/types'

// Enable streaming by default, can be configured
const USE_STREAMING = true

// Maximum retry attempts for Mermaid auto-fix
const MAX_MERMAID_FIX_ATTEMPTS = 3

/**
 * Build multimodal content from text, attachments, and optional current thumbnail
 * @param text - The text content
 * @param attachments - Optional user attachments (images or documents)
 * @param currentThumbnail - Optional current diagram thumbnail for context
 */
function buildMultimodalContent(
  text: string,
  attachments?: Attachment[],
  currentThumbnail?: string
): string | ContentPart[] {
  const hasAttachments = attachments && attachments.length > 0
  const hasThumbnail = currentThumbnail && currentThumbnail.trim() !== ''

  if (!hasAttachments && !hasThumbnail) {
    return text
  }

  const parts: ContentPart[] = []

  // Add current thumbnail first for context (if available)
  if (hasThumbnail) {
    parts.push({
      type: 'image_url',
      image_url: { url: currentThumbnail },
    })
  }

  // Add text content
  if (text) {
    parts.push({ type: 'text', text })
  }

  // Add user attachments
  if (hasAttachments) {
    for (const attachment of attachments) {
      if (attachment.type === 'image') {
        parts.push({
          type: 'image_url',
          image_url: { url: attachment.dataUrl },
        })
      } else if (attachment.type === 'document') {
        // For documents, append the extracted text content
        parts.push({
          type: 'text',
          text: `\n\n[Document: ${attachment.fileName}]\n${attachment.content}`,
        })
      } else if (attachment.type === 'url') {
        // For URLs, append the extracted markdown content
        parts.push({
          type: 'text',
          text: `\n\n[URL: ${attachment.title}]\n${attachment.content}`,
        })
      }
    }
  }

  return parts
}

export function useAIGenerate() {
  const { t } = useTranslation()
  const {
    addMessage,
    updateMessage,
    setStreaming,
    saveMessage,
  } = useChatStore()

  const canvasIsEmpty = useEditorStore(selectIsEmpty)

  const {
    currentProject,
    currentContent,
    setContentFromVersion,
    setLoading,
    setProject,
  } = useEditorStore()

  const { setMessages } = usePayloadStore()
  const { success, error: showError } = useToast()

  /**
   * Generate diagram using AI with streaming support
   * @param userInput - User's description or modification request
   * @param isInitial - Whether this is initial generation (empty canvas)
   * @param attachments - Optional attachments (images or documents)
   */
  const generate = async (
    userInput: string,
    isInitial: boolean,
    attachments?: Attachment[]
  ) => {
    if (!currentProject) return

    const engineType = currentProject.engineType
    const systemPrompt = SYSTEM_PROMPTS[engineType]

    // Add user message to UI (with attachments)
    addMessage({
      role: 'user',
      content: userInput,
      status: 'complete',
      attachments,
    })

    // Add assistant message placeholder
    const assistantMsgId = addMessage({
      role: 'assistant',
      content: '',
      status: 'streaming',
    })

    setStreaming(true)
    setLoading(true)

    try {
      let finalCode: string

      if (isInitial) {
        // 暂时全都使用一步生成
        const useTwoPhase = false

        if (useTwoPhase) {
          finalCode = await twoPhaseGeneration(
            userInput,
            engineType,
            systemPrompt,
            assistantMsgId,
            attachments
          )
        } else {
          finalCode = await singlePhaseInitialGeneration(
            userInput,
            engineType,
            systemPrompt,
            assistantMsgId,
            attachments
          )
        }
      } else {
        // Single-phase for edits - pass current thumbnail for context
        finalCode = await singlePhaseGeneration(
          userInput,
          currentContent,
          engineType,
          systemPrompt,
          assistantMsgId,
          attachments,
          currentProject.thumbnail
        )
      }

      // Validate the generated content with auto-fix for Mermaid
      let validatedCode = finalCode
      let validation = await validateContent(validatedCode, engineType)

      // Auto-fix mechanism for Mermaid engine
      if (!validation.valid && engineType === 'mermaid') {
        validatedCode = await attemptMermaidAutoFix(
          validatedCode,
          validation.error || 'Unknown error',
          systemPrompt,
          assistantMsgId
        )
        // Re-validate after fix attempts
        validation = await validateContent(validatedCode, engineType)
      }

      if (!validation.valid) {
        throw new Error(`Invalid ${engineType} output: ${validation.error}`)
      }

      // Use the validated (possibly fixed) code
      finalCode = validatedCode

      // Update content (AI generation auto-saves, so mark as saved)
      setContentFromVersion(finalCode)

      // Update assistant message
      updateMessage(assistantMsgId, {
        content: t('ai.generatedSuccess'),
        status: 'complete',
        code: finalCode,
      })

      // 生成结束，把助手消息（含源码）保存到本地
      await saveMessage(assistantMsgId)

      // Save version
      await VersionRepository.create({
        projectId: currentProject.id,
        content: finalCode,
        changeSummary: isInitial ? t('ai.changeSummaryInitial') : t('ai.changeSummaryEdit'),
      })

      // Generate and save thumbnail
      // For drawio, use the registered thumbnailGetter from CanvasArea for accurate rendering
      try {
        let thumbnail: string = ''
        if (engineType === 'drawio') {
          // For drawio, wait a bit for the editor to be ready after content update
          // Then retry getting thumbnail with delay
          const getThumbnailWithRetry = async (maxRetries = 3, delay = 500): Promise<string> => {
            for (let i = 0; i < maxRetries; i++) {
              // Wait for editor to process the new content
              await new Promise(resolve => setTimeout(resolve, delay))
              // Get fresh thumbnailGetter from store
              const getter = useEditorStore.getState().thumbnailGetter
              if (getter) {
                const result = await getter()
                if (result) return result
              }
            }
            return ''
          }
          thumbnail = await getThumbnailWithRetry()
        } else {
          // Use fallback method for other engines
          thumbnail = await generateThumbnail(finalCode, engineType)
        }
        if (thumbnail) {
          await ProjectRepository.update(currentProject.id, { thumbnail })
          // Update currentProject in store so thumbnail is visible immediately
          setProject({ ...currentProject, thumbnail })
        }
      } catch (err) {
        console.error('Failed to generate thumbnail:', err)
      }

      // Update project timestamp
      await ProjectRepository.update(currentProject.id, {})

      success(t('ai.generatedSuccess'))

    } catch (error) {
      console.error('AI generation failed:', error)
      updateMessage(assistantMsgId, {
        content: `Error: ${error instanceof Error ? error.message : t('ai.generationFailed')}`,
        status: 'error',
      })
      await saveMessage(assistantMsgId)
      showError(error instanceof Error ? error.message : t('ai.generationFailed'))
    } finally {
      setStreaming(false)
      setLoading(false)
    }
  }

  /**
   * Two-phase generation for initial creation (drawio/excalidraw)
   */
  const twoPhaseGeneration = async (
    userInput: string,
    engineType: EngineType,
    systemPrompt: string,
    assistantMsgId: string,
    attachments?: Attachment[]
  ): Promise<string> => {
    // Phase 1: Generate elements
    updateMessage(assistantMsgId, {
      content: t('ai.phase1'),
      status: 'streaming',
    })

    const phase1Prompt = buildInitialPrompt(userInput, true, 'elements')
    const phase1Content = buildMultimodalContent(phase1Prompt, attachments)

    const phase1Messages: PayloadMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: phase1Content },
    ]

    setMessages(phase1Messages)

    let elements: string
    if (USE_STREAMING) {
      const response = await aiService.streamChat(
        phase1Messages,
        (_chunk, accumulated) => {
          updateMessage(assistantMsgId, {
            content: `${t('ai.phase1')}\n\n${accumulated}`,
          })
        }
      )
      elements = extractCode(response, engineType)
    } else {
      const response = await aiService.chat(phase1Messages)
      elements = extractCode(response, engineType)
    }

    // Phase 2: Generate links/connections
    updateMessage(assistantMsgId, {
      content: t('ai.phase2'),
      status: 'streaming',
    })

    // Generate thumbnail from phase 1 elements for context
    let phase1Thumbnail: string | undefined
    try {
      phase1Thumbnail = await generateThumbnail(elements, engineType)
    } catch (err) {
      console.error('Failed to generate phase 1 thumbnail:', err)
    }

    const phase2Prompt = buildInitialPrompt(userInput, true, 'links', elements)
    const phase2Content = buildMultimodalContent(phase2Prompt, attachments, phase1Thumbnail)
    const phase2Messages: PayloadMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: phase1Content },
      { role: 'assistant', content: elements },
      { role: 'user', content: phase2Content },
    ]

    setMessages(phase2Messages)

    if (USE_STREAMING) {
      const response = await aiService.streamChat(
        phase2Messages,
        (_chunk, accumulated) => {
          updateMessage(assistantMsgId, {
            content: `${t('ai.phase2')}\n\n${accumulated}`,
          })
        }
      )
      return extractCode(response, engineType)
    } else {
      const response = await aiService.chat(phase2Messages)
      return extractCode(response, engineType)
    }
  }

  /**
   * Single-phase generation for initial creation (mermaid)
   */
  const singlePhaseInitialGeneration = async (
    userInput: string,
    engineType: EngineType,
    systemPrompt: string,
    assistantMsgId: string,
    attachments?: Attachment[]
  ): Promise<string> => {
    updateMessage(assistantMsgId, {
      content: t('ai.generating'),
      status: 'streaming',
    })

    const prompt = buildInitialPrompt(userInput, false)
    const content = buildMultimodalContent(prompt, attachments)

    const messages: PayloadMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content },
    ]

    setMessages(messages)

    if (USE_STREAMING) {
      const response = await aiService.streamChat(
        messages,
        (_chunk, accumulated) => {
          updateMessage(assistantMsgId, {
            content: `${t('ai.generating')}\n\n${accumulated}`,
          })
        }
      )
      return extractCode(response, engineType)
    } else {
      const response = await aiService.chat(messages)
      return extractCode(response, engineType)
    }
  }

  /**
   * Single-phase generation for edits
   * @param currentThumbnail - Current diagram thumbnail for AI context
   */
  const singlePhaseGeneration = async (
    userInput: string,
    currentCode: string,
    engineType: EngineType,
    systemPrompt: string,
    assistantMsgId: string,
    attachments?: Attachment[],
    currentThumbnail?: string
  ): Promise<string> => {
    const editPrompt = buildEditPrompt(currentCode, userInput)
    const editContent = buildMultimodalContent(editPrompt, attachments, currentThumbnail)

    const messages: PayloadMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: editContent },
    ]

    setMessages(messages)

    if (USE_STREAMING) {
      const response = await aiService.streamChat(
        messages,
        (_chunk, accumulated) => {
          updateMessage(assistantMsgId, {
            content: `${t('ai.modifying')}\n\n${accumulated}`,
          })
        }
      )
      return extractCode(response, engineType)
    } else {
      const response = await aiService.chat(messages)
      return extractCode(response, engineType)
    }
  }

  /**
   * Attempt to auto-fix Mermaid code errors by asking AI to fix them
   */
  const attemptMermaidAutoFix = async (
    failedCode: string,
    errorMessage: string,
    systemPrompt: string,
    assistantMsgId: string
  ): Promise<string> => {
    let currentCode = failedCode
    let currentError = errorMessage
    let attempts = 0

    while (attempts < MAX_MERMAID_FIX_ATTEMPTS) {
      attempts++

      updateMessage(assistantMsgId, {
        content: t('ai.fixAttempt', { attempt: attempts, max: MAX_MERMAID_FIX_ATTEMPTS, error: currentError }),
        status: 'streaming',
      })

      const fixPrompt = t('ai.fixPrompt', { error: currentError, code: currentCode })

      const messages: PayloadMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fixPrompt },
      ]

      setMessages(messages)

      let fixedCode: string
      if (USE_STREAMING) {
        const response = await aiService.streamChat(
          messages,
          (_chunk, accumulated) => {
            updateMessage(assistantMsgId, {
              content: `${t('ai.fixAttempt', { attempt: attempts, max: MAX_MERMAID_FIX_ATTEMPTS, error: '' })}\n\n${accumulated}`,
            })
          }
        )
        fixedCode = extractCode(response, 'mermaid')
      } else {
        const response = await aiService.chat(messages)
        fixedCode = extractCode(response, 'mermaid')
      }

      // Validate the fixed code
      const validation = await validateContent(fixedCode, 'mermaid')
      if (validation.valid) {
        return fixedCode
      }

      // Update for next iteration
      currentCode = fixedCode
      currentError = validation.error || 'Unknown error'
    }

    // Return the last attempted code (will be validated again in caller)
    return currentCode
  }

  /**
   * 重新发送：找到该助手消息对应的用户消息，移除旧回复后重新生成
   */
  const retry = async (assistantMessageId: string) => {
    const { messages, removeMessage } = useChatStore.getState()
    const index = messages.findIndex((msg) => msg.id === assistantMessageId)
    if (index < 0) {
      showError(t('ai.retryContextMissing'))
      return
    }

    // 找到该助手消息之前最近的一条用户消息
    const userMessage = messages
      .slice(0, index)
      .reverse()
      .find((msg) => msg.role === 'user')
    if (!userMessage) {
      showError(t('ai.retryContextMissing'))
      return
    }

    // 移除旧的助手消息（以及其后的助手消息）
    for (const msg of messages.slice(index)) {
      if (msg.role === 'assistant') removeMessage(msg.id)
    }

    await generate(userMessage.content, canvasIsEmpty, userMessage.attachments)
  }

  return { generate, retry }
}
