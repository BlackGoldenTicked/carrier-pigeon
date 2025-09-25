import React, { useState, useEffect } from 'react'
import { Layout, Button, Space, Typography, Tooltip } from 'antd'
import { SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { ConversationList } from '../chat/ConversationList'
import { ChatArea } from '../chat/ChatArea'
import { ApiConfig } from '../chat/ApiConfig'
import { useChat } from '../../hooks/useChat'

const { Sider, Content, Header } = Layout
const { Title, Text } = Typography

/**
 * Pro 模式组件
 * 完整的AI对话功能，包含左侧对话列表和右侧对话区域
 */
export default function ProMode() {
  const [configVisible, setConfigVisible] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  
  const {
    conversations,
    currentConversation,
    isLoading,
    error,
    initializeService,
    createConversation,
    switchConversation,
    deleteConversation,
    sendMessage,
    clearError
  } = useChat()

  /**
   * 检查是否已配置API
   */
  useEffect(() => {
    const apiKey = localStorage.getItem('openrouter_api_key')
    const model = localStorage.getItem('openrouter_model')
    
    if (apiKey && model) {
      setIsConfigured(true)
      initializeService(apiKey, model)
    } else {
      setConfigVisible(true)
    }
  }, [initializeService])

  /**
   * 处理API配置保存
   */
  const handleApiConfigSave = (apiKey: string, model: string) => {
    setIsConfigured(true)
    initializeService(apiKey, model)
    
    // 如果还没有对话，自动创建第一个
    if (conversations.length === 0) {
      createConversation('我的第一个对话')
    }
  }

  /**
   * 处理发送消息
   */
  const handleSendMessage = (content: string) => {
    if (!isConfigured) {
      setConfigVisible(true)
      return
    }

    // 如果没有当前对话，先创建一个
    if (!currentConversation) {
      const newConvId = createConversation()
      sendMessage({ content, conversationId: newConvId })
    } else {
      sendMessage({ content })
    }
  }

  /**
   * 处理创建新对话
   */
  const handleCreateConversation = () => {
    if (!isConfigured) {
      setConfigVisible(true)
      return
    }
    createConversation()
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <Layout className="h-full">
        {/* 头部 */}
        <Header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
          <Space>
            <Title level={3} className="m-0 dark:text-white">
              AI 对话助手
            </Title>
            <Text type="secondary" className="dark:text-gray-400">
              Pro 模式
            </Text>
          </Space>
          
          <Space>
            <Tooltip title="使用说明">
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={() => {
                  window.open('https://openrouter.ai/docs', '_blank')
                }}
              />
            </Tooltip>
            
            <Tooltip title="API 配置">
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => setConfigVisible(true)}
              />
            </Tooltip>
            
            {isConfigured && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Text type="secondary" className="text-sm dark:text-gray-400">
                  已连接
                </Text>
              </div>
            )}
          </Space>
        </Header>

        <Layout className="flex-1">
          {/* 左侧对话列表 */}
          <Sider
            width={320}
            className="bg-white dark:bg-gray-900"
            style={{ borderRight: '1px solid #f0f0f0' }}
          >
            <ConversationList
              conversations={conversations.map(conv => ({
                id: conv.id,
                title: conv.title,
                lastMessage: conv.messages[conv.messages.length - 1]?.content || '',
                timestamp: conv.updatedAt
              }))}
              currentConversationId={currentConversation?.id || null}
              onSelectConversation={switchConversation}
              onCreateConversation={handleCreateConversation}
              onDeleteConversation={deleteConversation}
            />
          </Sider>

          {/* 右侧对话区域 */}
          <Content className="flex-1">
            <ChatArea
              messages={(currentConversation?.messages || [])
                .filter(msg => msg.role !== 'system')
                .map(msg => ({
                  id: msg.id,
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content,
                  timestamp: msg.timestamp
                }))}
              isLoading={isLoading}
              error={error}
              onSendMessage={handleSendMessage}
              onClearError={clearError}
              hasConfig={isConfigured}
              onOpenConfig={() => setConfigVisible(true)}
            />
          </Content>
        </Layout>
      </Layout>

      {/* API配置弹窗 */}
      <ApiConfig
        visible={configVisible}
        onClose={() => setConfigVisible(false)}
        onSave={handleApiConfigSave}
      />
    </div>
  )
}