import { useState, useCallback, useRef } from 'react'
import { ChatMessage, ChatConversation, ChatState, SendMessageParams } from '../types/chat'
import { OpenRouterService } from '../services/openrouter'

/**
 * 对话管理Hook
 */
export function useChat() {
  const [state, setState] = useState<ChatState>({
    conversations: [],
    currentConversationId: null,
    isLoading: false,
    error: null
  })

  const openRouterRef = useRef<OpenRouterService | null>(null)

  /**
   * 初始化OpenRouter服务
   */
  const initializeService = useCallback((apiKey: string, model: string = 'anthropic/claude-3-haiku') => {
    openRouterRef.current = new OpenRouterService({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      model
    })
  }, [])

  /**
   * 创建新对话
   */
  const createConversation = useCallback((title?: string): string => {
    const newConversation: ChatConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || `新对话 ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    setState(prev => ({
      ...prev,
      conversations: [newConversation, ...prev.conversations],
      currentConversationId: newConversation.id
    }))

    return newConversation.id
  }, [])

  /**
   * 切换当前对话
   */
  const switchConversation = useCallback((conversationId: string) => {
    setState(prev => ({
      ...prev,
      currentConversationId: conversationId
    }))
  }, [])

  /**
   * 删除对话
   */
  const deleteConversation = useCallback((conversationId: string) => {
    setState(prev => {
      const newConversations = prev.conversations.filter(conv => conv.id !== conversationId)
      const newCurrentId = prev.currentConversationId === conversationId 
        ? (newConversations[0]?.id || null)
        : prev.currentConversationId

      return {
        ...prev,
        conversations: newConversations,
        currentConversationId: newCurrentId
      }
    })
  }, [])

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async ({ content, conversationId }: SendMessageParams) => {
    if (!openRouterRef.current) {
      setState(prev => ({ ...prev, error: '请先配置API密钥' }))
      return
    }

    const targetConversationId = conversationId || state.currentConversationId
    if (!targetConversationId) {
      setState(prev => ({ ...prev, error: '请先选择或创建对话' }))
      return
    }

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'sent'
    }

    // 创建AI消息占位符
    const aiMessage: ChatMessage = {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending'
    }

    // 添加消息到对话
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      conversations: prev.conversations.map(conv => 
        conv.id === targetConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage, aiMessage],
              updatedAt: Date.now()
            }
          : conv
      )
    }))

    try {
      // 获取对话历史
      const conversation = state.conversations.find(conv => conv.id === targetConversationId)
      const messages = conversation ? [...conversation.messages, userMessage] : [userMessage]

      // 发送到AI服务
      const stream = await openRouterRef.current.sendMessage(messages)
      const reader = stream.getReader()

      let aiContent = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        aiContent += value

        // 更新AI消息内容
        setState(prev => ({
          ...prev,
          conversations: prev.conversations.map(conv =>
            conv.id === targetConversationId
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === aiMessage.id
                      ? { ...msg, content: aiContent, status: 'sent' as const }
                      : msg
                  )
                }
              : conv
          )
        }))
      }

    } catch (error) {
      console.error('发送消息失败:', error)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '发送消息失败',
        conversations: prev.conversations.map(conv =>
          conv.id === targetConversationId
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === aiMessage.id
                    ? { ...msg, content: '抱歉，消息发送失败，请重试。', status: 'error' as const }
                    : msg
                )
              }
            : conv
        )
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [state.currentConversationId, state.conversations])

  /**
   * 获取当前对话
   */
  const getCurrentConversation = useCallback((): ChatConversation | null => {
    if (!state.currentConversationId) return null
    return state.conversations.find(conv => conv.id === state.currentConversationId) || null
  }, [state.conversations, state.currentConversationId])

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // 状态
    conversations: state.conversations,
    currentConversation: getCurrentConversation(),
    isLoading: state.isLoading,
    error: state.error,

    // 操作
    initializeService,
    createConversation,
    switchConversation,
    deleteConversation,
    sendMessage,
    clearError
  }
}