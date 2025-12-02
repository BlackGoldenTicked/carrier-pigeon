import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, Typography, Space, Alert } from 'antd'
import { SettingOutlined, KeyOutlined, RobotOutlined } from '@ant-design/icons'

const { Text, Link } = Typography
const { Option } = Select

interface ApiConfigProps {
  visible: boolean
  onClose: () => void
  onSave: (apiKey: string, model: string) => void
}

/**
 * API配置组件
 * 用于配置OpenRouter API密钥和选择模型
 */
export function ApiConfig({ visible, onClose, onSave }: ApiConfigProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  /**
   * 常用模型列表
   */
  const popularModels = [
    {
      value: 'anthropic/claude-3-haiku',
      label: 'Claude 3 Haiku',
      description: '快速响应，适合日常对话'
    },
    {
      value: 'anthropic/claude-3-sonnet',
      label: 'Claude 3 Sonnet',
      description: '平衡性能，适合复杂任务'
    },
    {
      value: 'anthropic/claude-3-opus',
      label: 'Claude 3 Opus',
      description: '最强性能，适合专业工作'
    },
    {
      value: 'openai/ChatGPT-turbo',
      label: 'ChatGPT Turbo',
      description: '强大的多模态能力'
    },
    {
      value: 'openai/gpt-3.5-turbo',
      label: 'GPT-3.5 Turbo',
      description: '经济实用的选择'
    },
    {
      value: 'google/gemini-pro',
      label: 'Gemini Pro',
      description: 'Google的先进模型'
    }
  ]

  /**
   * 从本地存储加载配置
   */
  useEffect(() => {
    if (visible) {
      const savedApiKey = localStorage.getItem('openrouter_api_key')
      const savedModel = localStorage.getItem('openrouter_model') || 'anthropic/claude-3-haiku'
      
      form.setFieldsValue({
        apiKey: savedApiKey,
        model: savedModel
      })
    }
  }, [visible, form])

  /**
   * 处理保存配置
   */
  const handleSave = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      
      // 保存到本地存储
      localStorage.setItem('openrouter_api_key', values.apiKey)
      localStorage.setItem('openrouter_model', values.model)
      
      // 回调父组件
      onSave(values.apiKey, values.model)
      onClose()
    } catch (error) {
      console.error('配置保存失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>API 配置</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSave}>
          保存配置
        </Button>
      ]}
      width={600}
    >
      <Space direction="vertical" className="w-full" size="large">
        {/* 说明信息 */}
        <Alert
          message="配置说明"
          description={
            <div>
              <p>需要配置 OpenRouter API 密钥才能使用 AI 对话功能。</p>
              <p>
                还没有账号？
                <Link href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">
                  前往 OpenRouter 注册
                </Link>
              </p>
            </div>
          }
          type="info"
          showIcon
        />

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          {/* API 密钥 */}
          <Form.Item
            name="apiKey"
            label={
              <Space>
                <KeyOutlined />
                <span>API 密钥</span>
              </Space>
            }
            rules={[
              { required: true, message: '请输入 API 密钥' },
              { min: 10, message: 'API 密钥长度不能少于10位' }
            ]}
          >
            <Input.Password
              placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              size="large"
            />
          </Form.Item>

          {/* 模型选择 */}
          <Form.Item
            name="model"
            label={
              <Space>
                <RobotOutlined />
                <span>AI 模型</span>
              </Space>
            }
            rules={[{ required: true, message: '请选择 AI 模型' }]}
          >
            <Select
              placeholder="选择 AI 模型"
              size="large"
              showSearch
              optionFilterProp="children"
            >
              {popularModels.map(model => (
                <Option key={model.value} value={model.value}>
                  <div>
                    <div className="font-medium">{model.label}</div>
                    <div className="text-sm text-gray-500">{model.description}</div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>

        {/* 安全提示 */}
        <Alert
          message="安全提示"
          description="API 密钥将保存在本地浏览器中，不会上传到任何服务器。请妥善保管您的密钥。"
          type="warning"
          showIcon
        />
      </Space>
    </Modal>
  )
}