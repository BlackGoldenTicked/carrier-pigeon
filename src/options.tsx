import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { getQuickLinks, getAIModels, type QuickLink, type AIModel, type AIModelCategory } from './utils/configLoader'
import { FontManager } from './components/FontManager'
import { VideoManager } from './components/VideoManager'
import { ImageManager } from './components/ImageManager'
import { HeroTitleManager } from './components/HeroTitleManager'
import { VideoIcon, ImageIcon, TextIcon, ArrowLeftIcon } from './components/icons/ui'
import { ensureHeroFonts } from './utils/heroFonts'

/**2 * 图标获取工具函数
 */
const IconUtils = {
  /**
   * 从URL提取域名
   */
  extractDomain: (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname.replace(/^www\./, '')
    } catch {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
    }
  },

  /**
   * 获取网站图标URL的多种方式
   */
  getFaviconUrl: (url: string): string => {
    const domain = IconUtils.extractDomain(url)
    
    // 优先使用Google Favicon服务
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  },

  /**
   * 异步检查图标是否可用
   */
  checkIconAvailability: async (iconUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = iconUrl
      
      // 3秒超时
      setTimeout(() => resolve(false), 3000)
    })
  }
}

/**
 * 配置数据类型定义
 */
interface LinkConfig {
  id: number
  title: string
  url: string
  icon?: string // 网站图标URL，可选字段
}

/**
 * 一般模式模型配置接口
 * 只包含基本信息和页面地址
 */
interface BasicModelConfig {
  id: string
  name: string
  type: 'language' | 'multimedia'
  url: string
  enabled: boolean
  selectedColor?: string
}

interface ConfigData {
  links: LinkConfig[][]
  basicModels: BasicModelConfig[]  // 一般模式模型配置
  theme: 'light' | 'dark'
}

/**
 * 从JSON文件加载基础模型配置
 */
const loadBasicModelsFromJSON = (): BasicModelConfig[] => {
  const aiModelCategories = getAIModels()
  const basicModels: BasicModelConfig[] = []
  
  aiModelCategories.forEach(category => {
    category.models.forEach(model => {
      basicModels.push({
        id: model.id,
        name: model.name,
        type: model.type,
        url: model.url,
        enabled: true,
        selectedColor: model.selectedColor
      })
    })
  })
  
  return basicModels
}

/**
 * 从JSON文件加载快捷链接配置
 */
const loadLinksFromJSON = (): LinkConfig[][] => {
  const quickLinksData = getQuickLinks()
  return quickLinksData.map(row => 
    row.map(link => ({
      id: link.id,
      title: link.title,
      url: link.url,
      icon: (link as any).icon ?? (link as any).favicon ?? (link as any).favIcon
    }))
  )
}

/**
 * 默认配置数据
 */
const defaultConfig: ConfigData = {
  links: loadLinksFromJSON(),
  basicModels: loadBasicModelsFromJSON(),
  theme: 'light'
}

/**
 * 配置选项页面组件
 */
function OptionsPage() {
  const [config, setConfig] = useState<ConfigData>(defaultConfig)
  const [activeTab, setActiveTab] = useState<'links' | 'fonts' | 'video' | 'image' | 'title'>('links')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [editingCell, setEditingCell] = useState<{type: 'link' | 'basicModel', id: string | number, field: string} | null>(null)

  /**
   * 注入 Hero 设计字体，保持与首页一致；并设置标签标题
   */
  useEffect(() => {
    ensureHeroFonts()
    document.title = '设置'
  }, [])

  /**
   * 主题与首页保持同步（读取首页主题开关写入的 mytab-theme）
   */
  useEffect(() => {
    let shouldBeDark = false
    try {
      const saved = localStorage.getItem('mytab-theme')
      if (saved === 'dark') {
        shouldBeDark = true
      } else if (saved === 'light') {
        shouldBeDark = false
      } else {
        shouldBeDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
      }
    } catch {
      shouldBeDark = false
    }

    setIsDarkMode(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  /**
   * 智能合并JSON文件和Chrome存储的配置数据
   * @param jsonConfig JSON文件中的默认配置
   * @param storageConfig Chrome存储中的用户配置
   * @returns 合并后的配置
   */
  const mergeConfigs = (jsonConfig: ConfigData, storageConfig: Partial<ConfigData>): ConfigData => {
    // 如果存储中没有配置，直接使用JSON默认配置
    if (!storageConfig || Object.keys(storageConfig).length === 0) {
      return jsonConfig
    }

    // 智能合并链接数据：优先使用存储中的数据，但确保结构完整
    const mergedLinks = storageConfig.links && storageConfig.links.length > 0 
      ? storageConfig.links 
      : jsonConfig.links

    // 智能合并基础模型数据：合并JSON中的新模型和存储中的用户设置
    const mergedBasicModels = (() => {
      const jsonModels = jsonConfig.basicModels || []
      const storageModels = storageConfig.basicModels || []
      
      // 创建存储模型的映射表
      const storageModelMap = new Map(storageModels.map(model => [model.id, model]))
      
      // 合并：JSON中的模型为基础，应用存储中的用户设置
      return jsonModels.map(jsonModel => {
        const storageModel = storageModelMap.get(jsonModel.id)
        return storageModel ? { ...jsonModel, ...storageModel } : jsonModel
      })
    })()

    return {
      ...jsonConfig,
      ...storageConfig,
      links: mergedLinks,
      basicModels: mergedBasicModels
    }
  }

  /**
   * 从 Chrome 存储加载配置并智能合并
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        let storageConfig: Partial<ConfigData> = {}
        
        if (chrome?.storage?.sync) {
          const result = await chrome.storage.sync.get(['mytab-config'])
          if (result['mytab-config']) {
            storageConfig = result['mytab-config']
          }
        } else {
          // 降级到 localStorage
          const savedConfig = localStorage.getItem('mytab-config')
          if (savedConfig) {
            storageConfig = JSON.parse(savedConfig)
          }
        }
        
        // 智能合并配置
        const mergedConfig = mergeConfigs(defaultConfig, storageConfig)
        setConfig(mergedConfig)
        
        // 如果合并后的配置与存储中的不同，更新存储
        const configChanged = JSON.stringify(mergedConfig) !== JSON.stringify(storageConfig)
        if (configChanged) {
          if (chrome?.storage?.sync) {
            await chrome.storage.sync.set({ 'mytab-config': mergedConfig })
          } else {
            localStorage.setItem('mytab-config', JSON.stringify(mergedConfig))
          }
          console.log('✅ 配置已同步更新')
        }
        
      } catch (error) {
        console.error('配置加载失败:', error)
        // 使用默认配置作为fallback
        setConfig(defaultConfig)
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
   * 每行最多显示的链接数
   */
  const LINKS_PER_ROW = 5
  const MAX_LINKS = 20

  /**
   * 将一维链接数组按每行 LINKS_PER_ROW 个重新分组为二维数组
   */
  const redistributeLinks = (flatLinks: LinkConfig[]): LinkConfig[][] => {
    const rows: LinkConfig[][] = []
    for (let i = 0; i < flatLinks.length; i += LINKS_PER_ROW) {
      rows.push(flatLinks.slice(i, i + LINKS_PER_ROW))
    }
    return rows.length > 0 ? rows : [[]]
  }

  /**
   * 添加新链接
   */
  const addLink = () => {
    const flatLinks = config.links.flat()

    if (flatLinks.length >= MAX_LINKS) {
      alert(`最多只能添加${MAX_LINKS}个快捷链接`)
      return
    }

    const newLink: LinkConfig = {
      id: Date.now(),
      title: '新链接',
      url: 'https://example.com'
    }

    flatLinks.push(newLink)
    const newConfig = { ...config, links: redistributeLinks(flatLinks) }
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
    const flatLinks = config.links.flat().filter(l => l.id !== linkId)
    const newConfig = { ...config, links: redistributeLinks(flatLinks) }
    saveConfig(newConfig)
  }

  /**
   * 处理单元格编辑
   */
  const handleCellEdit = (type: 'link' | 'basicModel', id: string | number, field: string) => {
    setEditingCell({ type, id, field })
  }

  /**
   * 处理单元格失去焦点
   */
  const handleCellBlur = (value: string) => {
    if (editingCell) {
      if (editingCell.type === 'link') {
        updateLinkField(editingCell.id as number, editingCell.field, value)
      }
    }
    setEditingCell(null)
  }

  const navItemClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-black text-white dark:bg-white dark:text-black'
        : 'text-[#6F6F6F] hover:bg-black/[0.05] hover:text-black dark:hover:bg-white/[0.06] dark:hover:text-white'
    }`

  return (
    <div className="app-shell min-h-screen bg-white text-[#3a3a3a] dark:bg-[#0a0a0a] dark:text-[#c4c4c4]">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        {/* 返回首页 */}
        <button
          onClick={() => {
            window.location.href = chrome.runtime.getURL('newtab.html')
          }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-[#3a3a3a] backdrop-blur transition-colors hover:bg-white hover:text-black dark:border-white/15 dark:bg-white/[0.04] dark:text-[#c4c4c4] dark:hover:bg-white/[0.08] dark:hover:text-white"
          title="返回标签首页"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          返回首页
        </button>

        <div className="flex gap-10">
          {/* 侧边栏导航 */}
          <nav className="w-52 shrink-0 space-y-1">
            <button onClick={() => setActiveTab('links')} className={navItemClass(activeTab === 'links')}>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
              链接管理
            </button>

            <button onClick={() => setActiveTab('fonts')} className={navItemClass(activeTab === 'fonts')}>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM16 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
              </svg>
              字体管理
            </button>

            <button onClick={() => setActiveTab('video')} className={navItemClass(activeTab === 'video')}>
              <VideoIcon className="h-5 w-5" />
              背景视频
            </button>

            <button onClick={() => setActiveTab('image')} className={navItemClass(activeTab === 'image')}>
              <ImageIcon className="h-5 w-5" />
              背景图片
            </button>

            <button onClick={() => setActiveTab('title')} className={navItemClass(activeTab === 'title')}>
              <TextIcon className="h-5 w-5" />
              标题文字
            </button>
          </nav>

          {/* 主内容区域 */}
          <main className="min-w-0 flex-1">
            {activeTab === 'links' && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-black dark:text-white">链接管理</h2>
                  <button
                    onClick={addLink}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.03] dark:bg-white dark:text-black"
                  >
                    + 添加链接
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-[#6F6F6F] mb-2">
                    点击单元格直接编辑，失去焦点自动保存。每行最多5个链接，最多支持{MAX_LINKS}个。
                  </p>
                  <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-sm text-[#6F6F6F]">
                      注意：在此处修改的链接只保存到浏览器存储中。如需与源代码保持同步，请在"数据管理"页面使用"保存到JSON"功能。
                    </p>
                  </div>
                </div>

                {/* 链接表格 */}
                <div className="space-y-8">
                  {config.links.map((row, rowIndex) => (
                    <div key={rowIndex}>
                      <h3 className="text-sm font-medium text-[#6F6F6F] mb-4">
                        第 {rowIndex + 1} 行 ({row.length}/{LINKS_PER_ROW})
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-black/5 dark:divide-white/10">
                          <thead className="border-b border-black/10 dark:border-white/10">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-[#9b9b9b] uppercase tracking-wider">图标</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-[#9b9b9b] uppercase tracking-wider">标题</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-[#9b9b9b] uppercase tracking-wider">URL</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-[#9b9b9b] uppercase tracking-wider">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5 dark:divide-white/10">
                            {row.map((link) => (
                              <tr key={link.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                                {/* 图标列 */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                                      {link.icon ? (
                                        <img 
                                          src={link.icon} 
                                          alt={`${link.title} icon`}
                                          className="w-6 h-6 rounded"
                                          onError={(e) => {
                                             // 图标加载失败时显示默认图标
                                             const img = e.currentTarget as HTMLImageElement
                                             const fallback = img.nextElementSibling as HTMLElement
                                             img.style.display = 'none'
                                             if (fallback) fallback.style.display = 'block'
                                           }}
                                        />
                                      ) : null}
                                      <div
                                        className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold bg-black text-white dark:bg-white dark:text-black ${link.icon ? 'hidden' : 'block'}`}
                                      >
                                        {link.title.charAt(0).toUpperCase()}
                                      </div>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={async () => {
                                          const iconUrl = IconUtils.getFaviconUrl(link.url)
                                          const newConfig = { ...config }
                                          const targetLink = newConfig.links.flat().find(l => l.id === link.id)
                                          if (targetLink) {
                                            targetLink.icon = iconUrl
                                            setConfig(newConfig)
                                            await saveConfig(newConfig)
                                          }
                                        }}
                                        className="text-xs text-[#6F6F6F] hover:text-black dark:hover:text-white"
                                        title="自动获取图标"
                                      >
                                        自动
                                      </button>
                                      {editingCell?.type === 'link' && editingCell.id === link.id && editingCell.field === 'icon' ? (
                                        <input
                                          type="url"
                                          defaultValue={link.icon || ''}
                                          placeholder="图标URL"
                                          onBlur={(e) => handleCellBlur(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                          className="w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-xs text-black focus:border-black focus:outline-none dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                                          autoFocus
                                        />
                                      ) : (
                                        <button
                                          onClick={() => handleCellEdit('link', link.id, 'icon')}
                                          className="text-xs text-[#9b9b9b] hover:text-black dark:hover:text-white"
                                          title="编辑图标URL"
                                        >
                                          编辑
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {/* 标题列 */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {editingCell?.type === 'link' && editingCell.id === link.id && editingCell.field === 'title' ? (
                                    <input
                                      type="text"
                                      defaultValue={link.title}
                                      onBlur={(e) => handleCellBlur(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                      className="w-full rounded-lg border border-black/15 bg-white px-2 py-1 text-sm text-black focus:border-black focus:outline-none dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      onClick={() => handleCellEdit('link', link.id, 'title')}
                                      className="cursor-pointer rounded-md p-1 font-medium text-black hover:bg-black/[0.05] dark:text-white dark:hover:bg-white/[0.06]"
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
                                      className="w-full rounded-lg border border-black/15 bg-white px-2 py-1 text-sm text-black focus:border-black focus:outline-none dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      onClick={() => handleCellEdit('link', link.id, 'url')}
                                      className="max-w-xs cursor-pointer truncate rounded-md p-1 text-sm text-[#6F6F6F] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                                    >
                                      {link.url}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => deleteLink(link.id)}
                                    className="rounded-full border border-black/10 px-3 py-1 text-xs text-[#6F6F6F] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
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

            {activeTab === 'fonts' && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <h2 className="text-lg font-medium text-black dark:text-white mb-6">字体管理</h2>
                <FontManager />
              </div>
            )}

            {activeTab === 'video' && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <h2 className="text-lg font-medium text-black dark:text-white mb-6">背景视频</h2>
                <VideoManager />
              </div>
            )}

            {activeTab === 'image' && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <h2 className="text-lg font-medium text-black dark:text-white mb-6">背景图片</h2>
                <ImageManager />
              </div>
            )}

            {activeTab === 'title' && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <h2 className="text-lg font-medium text-black dark:text-white mb-6">标题文字</h2>
                <HeroTitleManager />
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
  document.title = '设置'
  const rootContainer = document.querySelector('#__plasmo')
  if (!rootContainer) {
    throw new Error('Failed to find the root container')
  }

  const root = createRoot(rootContainer)
  root.render(<OptionsPage />)
}

init()
