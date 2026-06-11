import React, { useCallback, useEffect, useState } from 'react'
import './style.css'

import { ModeSelector } from './components/ui/mode-selector'
import { NormalMode } from './components/NormalMode'
import { QuickSettingsPanel } from './components/QuickSettingsPanel'
import { Toaster, toast } from './components/ui/toast'
import { SettingsIcon, SunIcon, MoonIcon } from './components/icons/ui'
import { getModeConfig, getTabMode } from './utils/configLoader'
import {
  loadAppConfig,
  saveLinks,
  saveModels,
  subscribeAppConfig,
  type AppConfig,
  type AIModelItem,
  type QuickLinkItem
} from './utils/appConfig'
import {
  readBgMode,
  writeBgMode,
  resolveIsDark,
  readThemePref,
  writeThemePref,
  type BgMode
} from './utils/prefs'
import { useFontSettings } from './hooks/useFontSettings'
import { fontInjector } from './utils/fontInjector'
import { getRandomQuote } from './config/quotes'
import { startTitleMarquee } from './utils/titleMarquee'
import { getImageSource } from './utils/imageSource'

const TabMode = getTabMode()
const modeConfig = getModeConfig()
const MODE_KEY = 'mytab-current-mode'

/** 打开扩展设置页 */
function openOptionsPage(): void {
  if (chrome?.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage()
  } else {
    window.open(chrome.runtime.getURL('options.html'), '_blank')
  }
}

/** 同步读取保存的模式，避免异步加载导致的闪烁 */
function getSavedModeSync(): string {
  try {
    const saved = localStorage.getItem(MODE_KEY)
    if (saved && Object.values(TabMode).includes(saved)) {
      return saved
    }
  } catch {
    /* 忽略 */
  }
  return TabMode.NORMAL
}

/** 首屏前同步应用主题，避免闪烁 */
function applyThemeClass(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

applyThemeClass(resolveIsDark())

function NewTabPage() {
  const [currentMode, setCurrentMode] = useState(() => getSavedModeSync())
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [bgMode, setBgMode] = useState<BgMode>(() => readBgMode())
  const [isDark, setIsDark] = useState(() => resolveIsDark())
  const [config, setConfig] = useState<AppConfig | null>(null)

  const hasBgImage = getImageSource().type !== 'none'

  /** 加载配置并订阅其他页面（设置页 / 其他设备）的修改 */
  useEffect(() => {
    let cancelled = false
    loadAppConfig().then((loaded) => {
      if (!cancelled) {
        setConfig(loaded)
      }
    })
    const unsubscribe = subscribeAppConfig((partial) => {
      setConfig((prev) => (prev ? { ...prev, ...partial } : prev))
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  /** 应用主题；用户未手动设置时跟随系统变化 */
  useEffect(() => {
    applyThemeClass(isDark)
  }, [isDark])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const followSystem = () => {
      if (readThemePref() === null) {
        setIsDark(mediaQuery.matches)
      }
    }
    mediaQuery.addEventListener('change', followSystem)
    return () => mediaQuery.removeEventListener('change', followSystem)
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      writeThemePref(next ? 'dark' : 'light')
      return next
    })
  }

  /** 标签标题：每次打开随机一句，过长时在标签栏里滚动显示 */
  useEffect(() => {
    const stop = startTitleMarquee(getRandomQuote())
    return stop
  }, [])

  /** 极简模式 body 类，保证背景立即生效 */
  useEffect(() => {
    document.body.classList.toggle('minimal-mode', currentMode === TabMode.MINIMAL)
    return () => {
      document.body.classList.remove('minimal-mode')
    }
  }, [currentMode])

  /** 应用字体设置（newtab 始终应用；applyToAllPages 仅控制注入其他网页） */
  const { fontSettings, getEnabledFont } = useFontSettings()
  useEffect(() => {
    const enabledFont = getEnabledFont()
    if (enabledFont) {
      fontInjector.applySyncFontSettings(enabledFont, fontSettings)
    }
  }, [fontSettings, getEnabledFont])

  const handleModeChange = useCallback((mode: string) => {
    setCurrentMode(mode)
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      /* 存储不可用时仅会话内生效 */
    }
  }, [])

  /** 全局快捷键：⌘K 模式面板，⌘1/2 快速切换 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsModeSelectorOpen(true)
        return
      }
      if (!isModeSelectorOpen && (e.metaKey || e.ctrlKey)) {
        const modes = Object.keys(modeConfig)
        if (e.key === '1' && modes[0]) {
          e.preventDefault()
          handleModeChange(modes[0])
        } else if (e.key === '2' && modes[1]) {
          e.preventDefault()
          handleModeChange(modes[1])
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModeSelectorOpen, handleModeChange])

  /** 链接 / 模型修改：乐观更新 + 持久化，失败时回滚并提示 */
  const handleLinksChange = (links: QuickLinkItem[]) => {
    setConfig((prev) => (prev ? { ...prev, links } : prev))
    saveLinks(links).catch(() => {
      toast('保存失败，请检查浏览器同步设置', { kind: 'error' })
    })
  }

  const handleModelsChange = (models: AIModelItem[]) => {
    setConfig((prev) => (prev ? { ...prev, models } : prev))
    saveModels(models).catch(() => {
      toast('保存失败，请检查浏览器同步设置', { kind: 'error' })
    })
  }

  const handleBgModeChange = (mode: BgMode) => {
    setBgMode(mode)
    writeBgMode(mode)
  }

  const segBtnClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      active ? 'bg-ink text-bg' : 'text-ink2 hover:text-ink'
    }`

  return (
    <div className="relative">
      {/* 顶部右侧控制栏 */}
      <div className="fixed right-6 top-6 z-40 flex items-center gap-2">
        {/* 模式切换：一般 / 极简 */}
        <div className="flex items-center rounded-full border border-line bg-card/80 p-0.5">
          <button
            onClick={() => handleModeChange(TabMode.NORMAL)}
            className={segBtnClass(currentMode === TabMode.NORMAL)}
          >
            一般
          </button>
          <button
            onClick={() => handleModeChange(TabMode.MINIMAL)}
            className={segBtnClass(currentMode === TabMode.MINIMAL)}
          >
            极简
          </button>
        </div>

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
          title={isDark ? '切换到浅色' : '切换到深色'}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card/80 text-ink2 transition-colors hover:bg-card hover:text-ink"
        >
          {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>

        {/* 管理面板（高频操作） */}
        <button
          onClick={() => setIsPanelOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-85"
        >
          管理
        </button>

        {/* 全部设置（低频配置） */}
        <button
          onClick={openOptionsPage}
          aria-label="打开全部设置"
          title="全部设置"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card/80 text-ink2 transition-colors hover:bg-card hover:text-ink"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 模式选择面板（⌘K） */}
      <ModeSelector
        isOpen={isModeSelectorOpen}
        onClose={() => setIsModeSelectorOpen(false)}
        currentMode={currentMode}
        onModeChange={(mode) => {
          handleModeChange(mode)
          setIsModeSelectorOpen(false)
        }}
        modeConfig={modeConfig}
      />

      {/* 管理面板 */}
      {config && (
        <QuickSettingsPanel
          open={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          config={config}
          onLinksChange={handleLinksChange}
          onModelsChange={handleModelsChange}
          bgMode={bgMode}
          onBgModeChange={handleBgModeChange}
          hasBgImage={hasBgImage}
          onOpenOptions={openOptionsPage}
        />
      )}

      {/* 当前模式内容 */}
      {currentMode === TabMode.MINIMAL ? (
        <div className="min-h-screen w-full bg-bg" />
      ) : config ? (
        <NormalMode
          config={config}
          bgVideoEnabled={bgMode === 'video'}
          bgImageEnabled={bgMode === 'image'}
          onOpenPanel={() => setIsPanelOpen(true)}
        />
      ) : (
        <div className="flex min-h-screen w-full items-center justify-center bg-bg">
          <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-ink/70" />
        </div>
      )}

      <Toaster />
    </div>
  )
}

export default NewTabPage
