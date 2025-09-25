import React from 'react'
import { Conversations } from '@ant-design/x'
import { Button, Space, Typography, Card, Tooltip } from 'antd'
import { PlusOutlined, MessageOutlined, DeleteOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface Conversation {
  id: string
  title: string
  lastMessage?: string
  timestamp: number
}

interface ConversationListProps {
  conversations: Conversation[]
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onCreateConversation: () => void
  onDeleteConversation: (id: string) => void
}

/**
 * 对话列表组件 - 显示所有对话会话
 */
export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation
}) => {
  /**
   * 格式化时间显示
   */
  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return new Date(timestamp).toLocaleDateString()
  }

  /**
   * 截断文本
   */
  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
      }} />
      
      {/* 头部 */}
      <div style={{ 
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        position: 'relative',
        zIndex: 1
      }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              AI 对话助手
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
              智能对话，无限可能
            </Text>
          </div>
          
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateConversation}
            block
            size="large"
            style={{
              borderRadius: '12px',
              height: '48px',
              fontSize: '16px',
              fontWeight: 500,
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            新建对话
          </Button>
        </Space>
      </div>

      {/* 对话列表 */}
      <div style={{ 
        flex: 1, 
        padding: '16px',
        overflowY: 'auto',
        position: 'relative',
        zIndex: 1
      }}>
        {conversations.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: 'rgba(255,255,255,0.8)'
          }}>
            <MessageOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              暂无对话
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              点击上方按钮开始新的对话
            </div>
          </div>
        ) : (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                hoverable
                onClick={() => onSelectConversation(conversation.id)}
                style={{
                  borderRadius: '12px',
                  border: currentConversationId === conversation.id 
                    ? '2px solid rgba(255,255,255,0.6)' 
                    : '1px solid rgba(255,255,255,0.2)',
                  background: currentConversationId === conversation.id
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                bodyStyle={{ 
                  padding: '16px',
                  position: 'relative',
                  zIndex: 2
                }}
                onMouseEnter={(e) => {
                  if (currentConversationId !== conversation.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentConversationId !== conversation.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }
                }}
              >
                {/* 选中状态指示器 */}
                {currentConversationId === conversation.id && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.8))',
                    borderRadius: '0 2px 2px 0'
                  }} />
                )}
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: 500,
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {truncateText(conversation.title, 20)}
                    </div>
                    
                    {conversation.lastMessage && (
                      <div style={{ 
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '13px',
                        marginBottom: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {truncateText(conversation.lastMessage, 25)}
                      </div>
                    )}
                    
                    <div style={{ 
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '12px'
                    }}>
                      {formatTime(conversation.timestamp)}
                    </div>
                  </div>
                  
                  <Tooltip title="删除对话" placement="left">
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteConversation(conversation.id)
                      }}
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        border: 'none',
                        background: 'transparent',
                        marginLeft: '8px',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ff4d4f'
                        e.currentTarget.style.background = 'rgba(255,77,79,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    />
                  </Tooltip>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </div>
      
      {/* 底部装饰 */}
      <div style={{
        padding: '16px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        zIndex: 1
      }}>
        <Text style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: '12px'
        }}>
          Pro Mode · AI Powered
        </Text>
      </div>
    </div>
  )
}