import React, { useState, useRef, useEffect } from 'react'
import { Sender } from '@ant-design/x'
import { Typography, Space, Alert, Spin, Card, Button, message } from 'antd'
import { SettingOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatAreaProps {
  messages: Message[]
  isLoading: boolean
  error: string | null
  onSendMessage: (message: string) => void
  onClearError: () => void
  hasConfig: boolean
  onOpenConfig: () => void
}

/**
 * 欢迎提示词
 */
const welcomePrompts = [
  '帮我写一篇关于人工智能的文章',
  '解释一下量子计算的基本原理',
  '推荐几本值得阅读的技术书籍',
  '如何提高编程技能？'
]

/**
 * 聊天区域组件 - 显示对话消息和发送框
 */
export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  error,
  onSendMessage,
  onClearError,
  hasConfig,
  onOpenConfig
}) => {
  const [messageText, setMessageText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * 发送消息处理
   */
  const handleSend = (text: string) => {
    if (!text.trim()) return
    
    if (!hasConfig) {
      message.warning('请先配置API密钥')
      onOpenConfig()
      return
    }

    onSendMessage(text.trim())
    setMessageText('')
  }

  /**
   * 格式化消息内容
   */
  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  if (!hasConfig) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '40px'
        }}>
          <Card style={{ 
            maxWidth: '500px', 
            textAlign: 'center',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            border: 'none'
          }}>
            <Space direction="vertical" size="large">
              <div style={{ fontSize: '64px' }}>🤖</div>
              <Title level={3} style={{ color: '#1890ff', marginBottom: '8px' }}>
                欢迎使用 AI 对话助手
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                开始您的智能对话之旅，请先配置 API 密钥
              </Text>
              <Button 
                type="primary" 
                size="large"
                icon={<SettingOutlined />}
                onClick={onOpenConfig}
                style={{
                  borderRadius: '8px',
                  height: '48px',
                  fontSize: '16px',
                  background: 'linear-gradient(90deg, #1890ff 0%, #722ed1 100%)',
                  border: 'none'
                }}
              >
                配置 API 密钥
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
    }}>
      {/* 错误提示 */}
      {error && (
        <Alert
          message="发送失败"
          description={error}
          type="error"
          closable
          onClose={onClearError}
          style={{ 
            margin: '16px',
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(255,77,79,0.15)'
          }}
        />
      )}

      {/* 消息列表 */}
      <div style={{ 
        flex: 1, 
        padding: '16px 24px', 
        overflowY: 'auto',
        scrollBehavior: 'smooth'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <Title level={4} style={{ color: '#1890ff', marginBottom: '8px' }}>
                开始新的对话
              </Title>
              <Text type="secondary">选择一个话题开始，或者直接输入您的问题</Text>
            </div>
            
            <div style={{ maxWidth: '600px', width: '100%' }}>
              <Title level={5} style={{ marginBottom: '16px', color: '#666' }}>
                💡 推荐话题
              </Title>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {welcomePrompts.map((prompt, index) => (
                  <Card
                    key={index}
                    hoverable
                    onClick={() => handleSend(prompt)}
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #e8e8e8',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(10px)'
                    }}
                    bodyStyle={{ padding: '16px' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  >
                    <Text style={{ color: '#1890ff', fontWeight: 500 }}>
                      {prompt}
                    </Text>
                  </Card>
                ))}
              </Space>
            </div>
          </div>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeInUp 0.3s ease-out'
                }}
              >
                <Card
                  style={{
                    maxWidth: '70%',
                    borderRadius: '16px',
                    border: 'none',
                    background: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)'
                      : 'rgba(255,255,255,0.9)',
                    color: msg.role === 'user' ? '#fff' : '#333',
                    boxShadow: msg.role === 'user'
                      ? '0 8px 25px rgba(24,144,255,0.3)'
                      : '0 4px 15px rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(10px)'
                  }}
                  bodyStyle={{ 
                    padding: '16px 20px',
                    lineHeight: '1.6'
                  }}
                >
                  <div style={{ 
                    fontSize: '15px',
                    wordBreak: 'break-word'
                  }}>
                    {formatMessageContent(msg.content)}
                  </div>
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    opacity: 0.7,
                    textAlign: 'right'
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </Card>
              </div>
            ))}
            
            {/* 加载状态 */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Card
                  style={{
                    borderRadius: '16px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(10px)'
                  }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <Space>
                    <Spin size="small" />
                    <Text type="secondary">AI 正在思考中...</Text>
                  </Space>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </Space>
        )}
      </div>

      {/* 发送框 */}
      <div style={{ 
        padding: '16px 24px',
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(0,0,0,0.06)'
      }}>
        <Sender
          value={messageText}
          onChange={setMessageText}
          onSubmit={handleSend}
          placeholder="输入消息..."
          disabled={isLoading}
          style={{
            borderRadius: '12px',
            border: '1px solid #e8e8e8',
            boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
          }}
        />
      </div>
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}