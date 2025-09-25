/**
 * 对话消息类型定义
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status?: 'sending' | 'sent' | 'error'
}

/**
 * 对话会话类型定义
 */
export interface ChatConversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  model?: string
}

/**
 * OpenRouter API 配置
 */
export interface OpenRouterConfig {
  apiKey: string
  baseURL: string
  model: string
}

/**
 * 对话状态类型
 */
export interface ChatState {
  conversations: ChatConversation[]
  currentConversationId: string | null
  isLoading: boolean
  error: string | null
}

/**
 * 消息发送参数
 */
export interface SendMessageParams {
  content: string
  conversationId?: string
}