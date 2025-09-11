import React, { useState, useEffect } from 'react'

/**
 * 配置数据类型定义
 */
interface LinkConfig {
  id: number
  title: string
  url: string
}

interface ModelConfig {
  id: string
  name: string
  type: 'llm' | 'voice' | 'image' | 'video'
  apiKey?: string
  endpoint?: string
  enabled: boolean
}

interface ConfigData {
  links: LinkConfig[][]
  models: ModelConfig[]
  theme: 'light' | 'dark'
}

/**
 * 默认配置数据
 */
const defaultConfig: ConfigData = {
  links: [
    [
      { id: 1, title: 'Google', url: 'https://www.google.com' },
      { id: 2, title: 'GitHub', url: 'https://github.com' },
      { id: 3, title: 'YouTube', url: 'https://www.youtube.com' },
      { id: 4, title: 'Twitter', url: 'https://twitter.com' },
      { id: 5, title: 'ChatGPT', url: 'https://chat.openai.com' }
    ],
    [
      { id: 6, title: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { id: 7, title: 'MDN', url: 'https://developer.mozilla.org' },
      { id: 8, title: 'Dribbble', url: 'https://dribbble.com' },
      { id: 9, title: 'Figma', url: 'https://www.figma.com' },
      { id: 10, title: 'Notion', url: 'https://www.notion.so' }
    ]
  ],
  models: [
    { id: 'gpt-4', name: 'GPT-4', type: 'llm', enabled: true },
    { id: 'claude', name: 'Claude', type: 'llm', enabled: true },
    { id: 'gemini', name: 'Gemini', type: 'llm', enabled: true },
    { id: 'whisper', name: 'Whisper', type: 'voice', enabled: false },
    { id: 'dall-e', name: 'DALL-E', type: 'image', enabled: false },
    { id: 'midjourney', name: 'Midjourney', type: 'image', enabled: false }
  ],
  theme: 'light'
}

/**
 * 配置管理器组件
 */
export default function ConfigManager({ 
  type, 
  onClose 
}: { 
  type: 'links' | 'models'
  onClose: () => void 
}) {
  const [config, setConfig] = useState<ConfigData>(defaultConfig)
  const [editingLink, setEditingLink] = useState<LinkConfig | null>(null)
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null)
  const [modelFilter, setModelFilter] = useState<'all' | 'llm' | 'voice' | 'image' | 'video'>('all')

  /**
   * 从本地存储加载配置
   */
  useEffect(() => {
    const savedConfig = localStorage.getItem('mytab-config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        setConfig({ ...defaultConfig, ...parsed })
      } catch (error) {
        console.error('配置加载失败:', error)
      }
    }
  }, [])

  /**
   * 保存配置到本地存储
   */
  const saveConfig = (newConfig: ConfigData) => {
    setConfig(newConfig)
    localStorage.setItem('mytab-config', JSON.stringify(newConfig))
  }

  /**
   * 添加新链接
   */
  const addLink = () => {
    const newLink: LinkConfig = {
      id: Date.now(),
      title: '新链接',
      url: 'https://example.com'
    }
    setEditingLink(newLink)
  }

  /**
   * 保存链接
   */
  const saveLink = (link: LinkConfig) => {
    const newConfig = { ...config }
    let found = false
    
    // 查找并更新现有链接
    for (let i = 0; i < newConfig.links.length; i++) {
      const rowIndex = newConfig.links[i].findIndex(l => l.id === link.id)
      if (rowIndex !== -1) {
        newConfig.links[i][rowIndex] = link
        found = true
        break
      }
    }
    
    // 如果是新链接，添加到第一行
    if (!found) {
      if (newConfig.links[0].length < 5) {
        newConfig.links[0].push(link)
      } else if (newConfig.links[1].length < 5) {
        newConfig.links[1].push(link)
      }
    }
    
    saveConfig(newConfig)
    setEditingLink(null)
  }

  /**
   * 删除链接
   */
  const deleteLink = (linkId: number) => {
    const newConfig = { ...config }
    for (let i = 0; i < newConfig.links.length; i++) {
      newConfig.links[i] = newConfig.links[i].filter(l => l.id !== linkId)
    }
    saveConfig(newConfig)
  }

  /**
   * 保存模型配置
   */
  const saveModel = (model: ModelConfig) => {
    const newConfig = { ...config }
    const index = newConfig.models.findIndex(m => m.id === model.id)
    if (index !== -1) {
      newConfig.models[index] = model
    } else {
      newConfig.models.push(model)
    }
    saveConfig(newConfig)
    setEditingModel(null)
  }

  /**
   * 切换模型启用状态
   */
  const toggleModel = (modelId: string) => {
    const newConfig = { ...config }
    const model = newConfig.models.find(m => m.id === modelId)
    if (model) {
      model.enabled = !model.enabled
      saveConfig(newConfig)
    }
  }

  /**
   * 过滤模型
   */
  const filteredModels = config.models.filter(model => 
    modelFilter === 'all' || model.type === modelFilter
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {type === 'links' ? '🔗 链接管理' : '🤖 模型管理'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {type === 'links' ? (
            /* 链接管理界面 */
            <div>
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">管理快捷链接，最多支持两行各5个链接</p>
                <button
                  onClick={addLink}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  + 添加链接
                </button>
              </div>

              {/* 链接列表 */}
              <div className="space-y-6">
                {config.links.map((row, rowIndex) => (
                  <div key={rowIndex}>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                      第 {rowIndex + 1} 行
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {row.map((link) => (
                        <div key={link.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="text-2xl">🔗</div>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-gray-200">{link.title}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{link.url}</div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingLink(link)}
                              className="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => deleteLink(link.id)}
                              className="flex-1 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 模型管理界面 */
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                  {(['all', 'llm', 'voice', 'image', 'video'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setModelFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        modelFilter === filter
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter === 'all' ? '全部' : 
                       filter === 'llm' ? '大语言模型' :
                       filter === 'voice' ? '语音模型' :
                       filter === 'image' ? '图片模型' : '视频模型'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 模型列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredModels.map((model) => (
                  <div key={model.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{model.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {model.type === 'llm' ? '大语言模型' :
                           model.type === 'voice' ? '语音模型' :
                           model.type === 'image' ? '图片模型' : '视频模型'}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleModel(model.id)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          model.enabled
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {model.enabled ? '已启用' : '已禁用'}
                      </button>
                    </div>
                    <button
                      onClick={() => setEditingModel(model)}
                      className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      配置
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 链接编辑弹窗 */}
      {editingLink && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">编辑链接</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题</label>
                <input
                  type="text"
                  value={editingLink.title}
                  onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                <input
                  type="url"
                  value={editingLink.url}
                  onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => saveLink(editingLink)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setEditingLink(null)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 模型编辑弹窗 */}
      {editingModel && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">配置模型</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模型名称</label>
                <input
                  type="text"
                  value={editingModel.name}
                  onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                <input
                  type="password"
                  value={editingModel.apiKey || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, apiKey: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  placeholder="输入 API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API 端点</label>
                <input
                  type="url"
                  value={editingModel.endpoint || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, endpoint: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  placeholder="输入 API 端点 URL"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => saveModel(editingModel)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setEditingModel(null)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}