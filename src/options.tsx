import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

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
 * 配置选项页面组件
 */
function OptionsPage() {
  const [config, setConfig] = useState<ConfigData>(defaultConfig)
  const [activeTab, setActiveTab] = useState<'general' | 'links' | 'models'>('general')
  const [modelFilter, setModelFilter] = useState<'all' | 'llm' | 'voice' | 'image' | 'video'>('all')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [editingCell, setEditingCell] = useState<{type: 'link' | 'model', id: string | number, field: string} | null>(null)

  /**
   * 初始化主题检测
   */
  useEffect(() => {
    const updateTheme = () => {
      const savedTheme = config.theme
      const shouldBeDark = savedTheme === 'dark'
      
      setIsDarkMode(shouldBeDark)
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    updateTheme()
  }, [config.theme])

  /**
   * 从 Chrome 存储加载配置
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (chrome?.storage?.sync) {
          const result = await chrome.storage.sync.get(['mytab-config'])
          if (result['mytab-config']) {
            setConfig({ ...defaultConfig, ...result['mytab-config'] })
          }
        } else {
          // 降级到 localStorage
          const savedConfig = localStorage.getItem('mytab-config')
          if (savedConfig) {
            const parsed = JSON.parse(savedConfig)
            setConfig({ ...defaultConfig, ...parsed })
          }
        }
      } catch (error) {
        console.error('配置加载失败:', error)
      }
    }
    
    loadConfig()
  }, [])

  /**
   * 保存配置到 Chrome 存储
   */
  const saveConfig = async (newConfig: ConfigData) => {
    setSaveStatus('saving')
    
    try {
      setConfig(newConfig)
      
      if (chrome?.storage?.sync) {
        await chrome.storage.sync.set({ 'mytab-config': newConfig })
      } else {
        // 降级到 localStorage
        localStorage.setItem('mytab-config', JSON.stringify(newConfig))
      }
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('配置保存失败:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  /**
   * 处理主题切换
   */
  const handleThemeChange = (theme: 'light' | 'dark') => {
    const newConfig = { ...config, theme }
    saveConfig(newConfig)
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
    
    const newConfig = { ...config }
    if (newConfig.links[0].length < 5) {
      newConfig.links[0].push(newLink)
    } else if (newConfig.links[1].length < 5) {
      newConfig.links[1].push(newLink)
    }
    
    saveConfig(newConfig)
  }

  /**
   * 更新链接字段
   */
  const updateLinkField = (linkId: number, field: string, value: string) => {
    const newConfig = { ...config }
    
    for (let i = 0; i < newConfig.links.length; i++) {
      const linkIndex = newConfig.links[i].findIndex(l => l.id === linkId)
      if (linkIndex !== -1) {
        newConfig.links[i][linkIndex] = {
          ...newConfig.links[i][linkIndex],
          [field]: value
        }
        break
      }
    }
    
    saveConfig(newConfig)
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
   * 添加新模型
   */
  const addModel = () => {
    const newModel: ModelConfig = {
      id: `model-${Date.now()}`,
      name: '新模型',
      type: 'llm',
      enabled: false
    }
    
    const newConfig = { ...config }
    newConfig.models.push(newModel)
    saveConfig(newConfig)
  }

  /**
   * 更新模型字段
   */
  const updateModelField = (modelId: string, field: string, value: string | boolean) => {
    const newConfig = { ...config }
    const modelIndex = newConfig.models.findIndex(m => m.id === modelId)
    
    if (modelIndex !== -1) {
      newConfig.models[modelIndex] = {
        ...newConfig.models[modelIndex],
        [field]: value
      }
      saveConfig(newConfig)
    }
  }

  /**
   * 删除模型
   */
  const deleteModel = (modelId: string) => {
    const newConfig = { ...config }
    newConfig.models = newConfig.models.filter(m => m.id !== modelId)
    saveConfig(newConfig)
  }

  /**
   * 切换模型启用状态
   */
  const toggleModel = (modelId: string) => {
    updateModelField(modelId, 'enabled', !config.models.find(m => m.id === modelId)?.enabled)
  }

  /**
   * 处理单元格编辑
   */
  const handleCellEdit = (type: 'link' | 'model', id: string | number, field: string) => {
    setEditingCell({ type, id, field })
  }

  /**
   * 处理单元格失去焦点
   */
  const handleCellBlur = (value: string) => {
    if (editingCell) {
      if (editingCell.type === 'link') {
        updateLinkField(editingCell.id as number, editingCell.field, value)
      } else {
        updateModelField(editingCell.id as string, editingCell.field, value)
      }
    }
    setEditingCell(null)
  }

  /**
   * 导出配置
   */
  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mytab-config.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 导入配置
   */
  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          const newConfig = { ...defaultConfig, ...imported }
          saveConfig(newConfig)
        } catch (error) {
          alert('配置文件格式错误')
        }
      }
      reader.readAsText(file)
    }
  }

  /**
   * 重置配置
   */
  const resetConfig = () => {
    if (confirm('确定要重置所有配置吗？此操作不可撤销。')) {
      saveConfig(defaultConfig)
    }
  }

  /**
   * 过滤模型
   */
  const filteredModels = config.models.filter(model => 
    modelFilter === 'all' || model.type === modelFilter
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MyTab 配置</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">管理您的新标签页设置</p>
            </div>
            
            {/* 保存状态指示器 */}
            <div className="flex items-center space-x-4">
              {saveStatus === 'saving' && (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  已保存
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center text-red-600 dark:text-red-400">
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  保存失败
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* 侧边栏导航 */}
          <nav className="w-64 space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'general'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              通用设置
            </button>
            
            <button
              onClick={() => setActiveTab('links')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'links'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
              链接管理
            </button>
            
            <button
              onClick={() => setActiveTab('models')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'models'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              模型管理
            </button>
          </nav>

          {/* 主内容区域 */}
          <main className="flex-1">
            {activeTab === 'general' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">通用设置</h2>
                
                {/* 主题设置 */}
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">主题模式</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'light', label: '☀️ 亮色模式', desc: '始终使用亮色主题' },
                      { value: 'dark', label: '🌙 暗色模式', desc: '始终使用暗色主题' }
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => handleThemeChange(theme.value as any)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          config.theme === theme.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{theme.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{theme.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 数据管理 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">数据管理</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <button
                        onClick={exportConfig}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        导出配置
                      </button>
                      
                      <label className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer">
                        导入配置
                        <input
                          type="file"
                          accept=".json"
                          onChange={importConfig}
                          className="hidden"
                        />
                      </label>
                      
                      <button
                        onClick={resetConfig}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        重置配置
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      配置数据存储在 Chrome 同步存储中，会在您的设备间自动同步。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'links' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">链接管理</h2>
                  <button
                    onClick={addLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    + 添加链接
                  </button>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  点击单元格直接编辑，失去焦点自动保存。最多支持两行各5个链接。
                </p>

                {/* 链接表格 */}
                <div className="space-y-8">
                  {config.links.map((row, rowIndex) => (
                    <div key={rowIndex}>
                      <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4">
                        第 {rowIndex + 1} 行 ({row.length}/5)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">标题</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">URL</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {row.map((link) => (
                              <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {editingCell?.type === 'link' && editingCell.id === link.id && editingCell.field === 'title' ? (
                                    <input
                                      type="text"
                                      defaultValue={link.title}
                                      onBlur={(e) => handleCellBlur(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                      className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      onClick={() => handleCellEdit('link', link.id, 'title')}
                                      className="font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded"
                                    >
                                      {link.title}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {editingCell?.type === 'link' && editingCell.id === link.id && editingCell.field === 'url' ? (
                                    <input
                                      type="url"
                                      defaultValue={link.url}
                                      onBlur={(e) => handleCellBlur(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                      className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      onClick={() => handleCellEdit('link', link.id, 'url')}
                                      className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded truncate max-w-xs"
                                    >
                                      {link.url}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => deleteLink(link.id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    删除
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">模型管理</h2>
                  <button
                    onClick={addModel}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    + 添加模型
                  </button>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  点击单元格直接编辑，失去焦点自动保存。
                </p>
                
                {/* 模型筛选 */}
                <div className="flex space-x-2 mb-6">
                  {(['all', 'llm', 'voice', 'image', 'video'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setModelFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        modelFilter === filter
                          ? 'bg-blue-600 text-white'
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

                {/* 模型表格 */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">名称</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">类型</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">API Key</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">端点</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredModels.map((model) => (
                        <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingCell?.type === 'model' && editingCell.id === model.id && editingCell.field === 'name' ? (
                              <input
                                type="text"
                                defaultValue={model.name}
                                onBlur={(e) => handleCellBlur(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => handleCellEdit('model', model.id, 'name')}
                                className="font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded"
                              >
                                {model.name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingCell?.type === 'model' && editingCell.id === model.id && editingCell.field === 'type' ? (
                              <select
                                defaultValue={model.type}
                                onBlur={(e) => handleCellBlur(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                autoFocus
                              >
                                <option value="llm">大语言模型</option>
                                <option value="voice">语音模型</option>
                                <option value="image">图片模型</option>
                                <option value="video">视频模型</option>
                              </select>
                            ) : (
                              <div
                                onClick={() => handleCellEdit('model', model.id, 'type')}
                                className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded"
                              >
                                {model.type === 'llm' ? '大语言模型' :
                                 model.type === 'voice' ? '语音模型' :
                                 model.type === 'image' ? '图片模型' : '视频模型'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingCell?.type === 'model' && editingCell.id === model.id && editingCell.field === 'apiKey' ? (
                              <input
                                type="password"
                                defaultValue={model.apiKey || ''}
                                onBlur={(e) => handleCellBlur(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="输入 API Key"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => handleCellEdit('model', model.id, 'apiKey')}
                                className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded truncate max-w-xs"
                              >
                                {model.apiKey ? '••••••••' : '点击设置'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingCell?.type === 'model' && editingCell.id === model.id && editingCell.field === 'endpoint' ? (
                              <input
                                type="url"
                                defaultValue={model.endpoint || ''}
                                onBlur={(e) => handleCellBlur(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="输入 API 端点"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => handleCellEdit('model', model.id, 'endpoint')}
                                className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded truncate max-w-xs"
                              >
                                {model.endpoint || '点击设置'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleModel(model.id)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                model.enabled
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {model.enabled ? '已启用' : '已禁用'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => deleteModel(model.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>


    </div>
  )
}

/**
 * 初始化选项页面
 */
function init() {
  const rootContainer = document.querySelector('#__plasmo')
  if (!rootContainer) {
    throw new Error('Failed to find the root container')
  }

  const root = createRoot(rootContainer)
  root.render(<OptionsPage />)
}

init()