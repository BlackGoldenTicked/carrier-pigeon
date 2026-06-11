import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

import { FontManager } from './components/FontManager'
import { VideoManager } from './components/VideoManager'
import { ImageManager } from './components/ImageManager'
import { HeroTitleManager } from './components/HeroTitleManager'
import { Toaster, toast } from './components/ui/toast'
import { VideoIcon, ImageIcon, TextIcon, ArrowLeftIcon } from './components/icons/ui'
import { ensureHeroFonts } from './utils/heroFonts'
import { resolveIsDark } from './utils/prefs'
import {
  loadAppConfig,
  saveModels,
  subscribeAppConfig,
  type AIModelItem
} from './utils/appConfig'

type TabId = 'title' | 'fonts' | 'video' | 'image' | 'models' | 'about'

interface NavItem {
  id: TabId
  label: string
  icon?: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: '外观',
    items: [
      { id: 'title', label: '标题文字', icon: <TextIcon className="h-4 w-4" /> },
      { id: 'fonts', label: '字体' },
      { id: 'video', label: '背景视频', icon: <VideoIcon className="h-4 w-4" /> },
      { id: 'image', label: '背景图片', icon: <ImageIcon className="h-4 w-4" /> }
    ]
  },
  {
    title: '平台',
    items: [{ id: 'models', label: 'AI 平台' }]
  },
  {
    title: '其他',
    items: [{ id: 'about', label: '关于与快捷键' }]
  }
]

const TAB_TITLES: Record<TabId, string> = {
  title: '标题文字',
  fonts: '字体',
  video: '背景视频',
  image: '背景图片',
  models: 'AI 平台',
  about: '关于与快捷键'
}

/** AI 平台管理：启用开关 + 地址展示（高频开关也可在首页「管理」面板完成） */
function ModelsManager() {
  const [models, setModels] = useState<AIModelItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAppConfig().then((config) => {
      if (!cancelled) {
        setModels(config.models)
      }
    })
    const unsubscribe = subscribeAppConfig((partial) => {
      if (partial.models) {
        setModels(partial.models)
      }
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const toggle = (model: AIModelItem) => {
    if (!models) {
      return
    }
    const next = models.map((m) => (m.id === model.id ? { ...m, enabled: !m.enabled } : m))
    setModels(next)
    saveModels(next).catch(() => {
      toast('保存失败，请检查浏览器同步设置', { kind: 'error' })
    })
  }

  if (!models) {
    return <p className="text-sm text-ink3">加载中…</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink2">
        启用的平台会出现在新标签页的 AI 指令台中；日常开关也可以在首页右上角「管理」里完成。
      </p>
      <ul className="space-y-1.5">
        {models.map((model) => (
          <li key={model.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-token-sm border border-line bg-card px-4 py-3 transition-colors hover:border-line2">
              <input
                type="checkbox"
                checked={model.enabled}
                onChange={() => toggle(model)}
                className="h-4 w-4 shrink-0 rounded accent-[var(--accent)]"
              />
              <span className="w-28 shrink-0 truncate text-sm font-medium text-ink">
                {model.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink3">{model.url}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink3">
                {model.type === 'language' ? '对话' : '多媒体'}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 关于：版本、快捷键说明、链接管理入口提示 */
function AboutSection() {
  const version = chrome?.runtime?.getManifest ? chrome.runtime.getManifest().version : '—'

  const shortcuts: Array<[string, string]> = [
    ['⌘ / Ctrl + Enter', '在 AI 指令台中发送'],
    ['⌘ / Ctrl + K', '打开模式选择面板'],
    ['⌘ / Ctrl + 1 / 2', '快速切换一般 / 极简模式'],
    ['⌘ / Ctrl + 点击链接', '多选链接，再点任意链接批量打开'],
    ['Esc', '关闭面板']
  ]

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-2 text-sm font-medium text-ink">MyTab</h3>
        <p className="text-sm text-ink2">
          版本 {version} · 一句话同时发给多个 AI 平台的新标签页
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink">快捷键</h3>
        <ul className="space-y-2">
          {shortcuts.map(([keys, desc]) => (
            <li key={keys} className="flex items-center gap-3 text-sm">
              <kbd className="shrink-0 rounded-token-sm border border-line bg-bg2 px-2 py-1 text-xs text-ink2">
                {keys}
              </kbd>
              <span className="text-ink2">{desc}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-token-sm border border-line bg-bg2 px-4 py-3">
        <p className="text-sm text-ink2">
          快捷链接的添加、排序和删除在新标签页右上角的「管理」面板中完成，改动即时生效。
        </p>
      </div>
    </div>
  )
}

/**
 * 设置页：低频配置（外观 / AI 平台 / 关于）
 * 高频操作（链接管理、背景开关）在新标签页的「管理」面板
 */
function OptionsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('title')

  /** 注入展示字体，与首页视觉一致；同步主题 */
  useEffect(() => {
    ensureHeroFonts()
    document.title = '设置'
    const isDark = resolveIsDark()
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }, [])

  const navItemClass = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-token-sm px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-ink text-bg' : 'text-ink2 hover:bg-bg2 hover:text-ink'
    }`

  return (
    <div className="app-shell min-h-screen bg-bg text-ink">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        {/* 返回首页 */}
        <button
          onClick={() => {
            window.location.href = chrome.runtime.getURL('newtab.html')
          }}
          className="mb-10 inline-flex items-center gap-2 rounded-token-sm border border-line bg-card px-4 py-2 text-sm text-ink2 transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          返回首页
        </button>

        <div className="flex gap-10">
          {/* 侧边栏导航（分组） */}
          <nav className="w-48 shrink-0 space-y-6" aria-label="设置导航">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-ink3">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={navItemClass(activeTab === item.id)}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* 主内容区域 */}
          <main className="min-w-0 flex-1">
            <div className="rounded-token border border-line bg-card p-6">
              <h2 className="mb-6 text-lg font-medium text-ink">{TAB_TITLES[activeTab]}</h2>
              {activeTab === 'title' && <HeroTitleManager />}
              {activeTab === 'fonts' && <FontManager />}
              {activeTab === 'video' && <VideoManager />}
              {activeTab === 'image' && <ImageManager />}
              {activeTab === 'models' && <ModelsManager />}
              {activeTab === 'about' && <AboutSection />}
            </div>
          </main>
        </div>
      </div>

      <Toaster />
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
