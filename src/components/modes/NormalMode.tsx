import React, { useState, useEffect } from 'react'
import { Search, ExternalLink, Sparkles, Clock, Calendar } from 'lucide-react'
import DarkVeil from '../ui/DarkVeil'

/**
 * 快捷链接接口
 */
interface QuickLink {
  id: number
  title: string
  url: string
  icon?: string
}

/**
 * AI模型接口
 */
interface AIModel {
  id: string
  name: string
  type: string
  url: string
  selectedColor: string
}

/**
 * 一般模式组件
 * 包含10个快捷链接和多模型对话框
 */
export default function NormalMode() {
  const [quickLinks, setQuickLinks] = useState<QuickLink[][]>([])
  const [aiModels, setAIModels] = useState<AIModel[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  /**
   * 加载配置数据
   */
  useEffect(() => {
    // 加载快捷链接
    import('../../config/quickLinks.json').then((data) => {
      setQuickLinks(data.quickLinks)
    })

    // 加载AI模型
    import('../../config/aiModels.json').then((data) => {
      const allModels = data.aiModelCategories.flatMap((category: any) => category.models)
      setAIModels(allModels)
      setSelectedModel(allModels[0] || null)
    })
  }, [])

  /**
   * 更新时间
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    if (!searchQuery.trim() || !selectedModel) return

    const searchUrl = `${selectedModel.url}?q=${encodeURIComponent(searchQuery)}`
    window.open(searchUrl, '_blank')
    setSearchQuery('')
  }

  /**
   * 处理快捷链接点击
   */
  const handleQuickLinkClick = (url: string) => {
    window.open(url, '_blank')
  }

  /**
   * 格式化时间
   */
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  /**
   * 格式化日期
   */
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* 动态背景 */}
      <div className="absolute inset-0 z-0">
        <DarkVeil />
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* 时间和日期显示 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-white/80 mr-2" />
            <h1 className="text-6xl font-light text-white tracking-wide">
              {formatTime(currentTime)}
            </h1>
          </div>
          <div className="flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white/60 mr-2" />
            <p className="text-xl text-white/80">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>

        {/* AI搜索框 */}
        <div className="w-full max-w-2xl mb-16">
          <div className={`relative transition-all duration-300 ${
            isSearchFocused ? 'transform scale-105' : ''
          }`}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索任何内容..."
                className="w-full pl-12 pr-32 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
              />
              {selectedModel && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <button
                    onClick={handleSearch}
                    className="flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105"
                    style={{ 
                      backgroundColor: selectedModel.selectedColor,
                      color: 'white'
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {selectedModel.name}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI模型选择器 */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {aiModels.slice(0, 6).map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                  selectedModel?.id === model.id
                    ? 'text-white shadow-lg'
                    : 'text-white/70 bg-white/10 hover:bg-white/20'
                }`}
                style={selectedModel?.id === model.id ? {
                  backgroundColor: model.selectedColor
                } : {}}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>

        {/* 快捷链接网格 */}
        <div className="w-full max-w-4xl">
          <h2 className="text-2xl font-light text-white/90 text-center mb-8">快捷访问</h2>
          <div className="grid grid-cols-5 gap-6">
            {quickLinks.flat().map((link) => (
              <div
                key={link.id}
                onClick={() => handleQuickLinkClick(link.url)}
                className="group cursor-pointer"
              >
                <div className="relative p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:shadow-2xl">
                  {/* 图标 */}
                  <div className="flex items-center justify-center mb-4">
                    {link.icon ? (
                      <img
                        src={link.icon}
                        alt={link.title}
                        className="w-8 h-8 rounded-lg"
                        onError={(e) => {
                          // 如果图标加载失败，显示默认图标
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <ExternalLink className={`w-8 h-8 text-white/80 ${link.icon ? 'hidden' : ''}`} />
                  </div>
                  
                  {/* 标题 */}
                  <h3 className="text-white font-medium text-center text-sm group-hover:text-white/90 transition-colors">
                    {link.title}
                  </h3>
                  
                  {/* 悬停效果 */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-16 text-center">
          <p className="text-white/60 text-sm">
            点击快捷链接访问网站，或使用上方搜索框进行AI搜索
          </p>
        </div>
      </div>
    </div>
  )
}