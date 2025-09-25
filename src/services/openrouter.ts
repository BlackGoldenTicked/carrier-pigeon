import { OpenRouterConfig, ChatMessage } from '../types/chat'

/**
 * OpenRouter API 服务类
 */
export class OpenRouterService {
  private config: OpenRouterConfig

  constructor(config: OpenRouterConfig) {
    this.config = config
  }

  /**
   * 发送消息到AI模型
   * @param messages 对话历史消息
   * @returns 流式响应
   */
  async sendMessage(messages: ChatMessage[]): Promise<ReadableStream<string>> {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MyTab AI Chat'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true,
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body received')
    }

    return this.createTextStream(response.body)
  }

  /**
   * 创建文本流处理器
   * @param body 响应体
   * @returns 文本流
   */
  private createTextStream(body: ReadableStream<Uint8Array>): ReadableStream<string> {
    const decoder = new TextDecoder()
    
    return new ReadableStream({
      start(controller) {
        const reader = body.getReader()
        
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close()
              return
            }
            
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                
                if (data === '[DONE]') {
                  controller.close()
                  return
                }
                
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  
                  if (content) {
                    controller.enqueue(content)
                  }
                } catch (error) {
                  console.warn('Failed to parse SSE data:', data)
                }
              }
            }
            
            return pump()
          })
        }
        
        return pump()
      }
    })
  }

  /**
   * 获取可用模型列表
   * @returns 模型列表
   */
  async getModels(): Promise<any[]> {
    const response = await fetch(`${this.config.baseURL}/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  }
}