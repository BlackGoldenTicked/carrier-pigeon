import React, { useEffect, useState } from 'react'
import { toast } from './ui/toast'
import {
  getHeroTitleConfig,
  saveHeroTitleConfig,
  applyHeroTitleStyle,
  clampHeroTitleText,
  heroTitleLength,
  getHeroTitleFont,
  HERO_TITLE_FONTS,
  MAX_HERO_TITLE_LENGTH,
  HERO_TITLE_SIZE_MIN,
  HERO_TITLE_SIZE_MAX,
  DEFAULT_HERO_TITLE,
  type HeroTitleConfig
} from '../utils/heroTitle'

/** 常用 Emoji，点击插入到文案末尾 */
const QUICK_EMOJIS = ['✨', '🚀', '🌙', '🔥', '💡', '🎯', '🌈', '⚡', '🦄', '☕']

/** 预览字号上限，避免大字号撑破设置面板 */
const PREVIEW_MAX_SIZE = 52

/**
 * 首页大标题管理：文案 / 字体 / 字号，支持 Emoji
 */
export function HeroTitleManager() {
  const [config, setConfig] = useState<HeroTitleConfig>(() => getHeroTitleConfig())

  // 进入设置即加载当前字体资源，保证预览即时呈现
  useEffect(() => {
    applyHeroTitleStyle(config)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = (msg: string, kind: 'info' | 'success' | 'error' = 'info') => toast(msg, { kind })

  /** 统一更新：保存 + 应用样式 */
  const update = (patch: Partial<HeroTitleConfig>) => {
    const next: HeroTitleConfig = { ...config, ...patch }
    setConfig(next)
    saveHeroTitleConfig(next)
    applyHeroTitleStyle(next)
  }

  const handleTextChange = (value: string) => {
    update({ text: clampHeroTitleText(value) })
  }

  const insertEmoji = (emoji: string) => {
    const next = clampHeroTitleText(config.text + emoji)
    if (heroTitleLength(next) === heroTitleLength(config.text)) {
      flash('已达字数上限', 'error')
      return
    }
    update({ text: next })
  }

  const resetText = () => {
    update({ text: DEFAULT_HERO_TITLE })
    flash('已恢复默认文案', 'success')
  }

  const used = heroTitleLength(config.text)
  const previewFont = getHeroTitleFont(config.fontId)
  const previewText = config.text.trim() || DEFAULT_HERO_TITLE
  const previewSize = Math.min(config.fontSize, PREVIEW_MAX_SIZE)

  return (
    <div className="space-y-6">
      {/* 文案 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink2">标题文案（支持 Emoji）</label>
          <span className={`text-xs ${used >= MAX_HERO_TITLE_LENGTH ? 'text-red-500' : 'text-ink3'}`}>
            {used}/{MAX_HERO_TITLE_LENGTH}
          </span>
        </div>
        <textarea
          value={config.text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={2}
          placeholder={DEFAULT_HERO_TITLE}
          className="w-full resize-none rounded-token-sm border border-line bg-card px-3 py-2 text-sm text-ink focus:border-line2 focus:outline-none"
        />
        {/* 快捷 Emoji */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-token-sm border border-line text-base transition-colors hover:border-line2 hover:bg-bg2"
              title={`插入 ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={resetText}
            className="ml-auto rounded-token-sm border border-line px-3 py-1.5 text-xs text-ink2 transition-colors hover:border-line2 hover:text-ink"
          >
            恢复默认
          </button>
        </div>
      </div>

      {/* 字号 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-ink2">字号：{config.fontSize}px</label>
        <input
          type="range"
          min={HERO_TITLE_SIZE_MIN}
          max={HERO_TITLE_SIZE_MAX}
          step={2}
          value={config.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-bg3 accent-[var(--accent)]"
        />
        <div className="mt-1 flex justify-between text-xs text-ink3">
          <span>{HERO_TITLE_SIZE_MIN}px</span>
          <span>{HERO_TITLE_SIZE_MAX}px</span>
        </div>
        <p className="mt-1 text-xs text-ink3">窄屏会按比例自适应缩小，此处为桌面端上限。</p>
      </div>

      {/* 字体 */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-ink2">标题字体</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HERO_TITLE_FONTS.map((font) => {
            const active = config.fontId === font.id
            return (
              <button
                key={font.id}
                onClick={() => update({ fontId: font.id })}
                className={`rounded-xl border p-4 text-left transition-all ${
                  active
                    ? 'border-accent bg-[var(--accent-bg)]'
                    : 'border-line hover:border-line2 hover:bg-card-hover'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-ink2">{font.label}</span>
                  {active && <div className="h-2 w-2 rounded-full bg-accent" />}
                </div>
                <div
                  className="truncate text-xl text-ink"
                  style={{ fontFamily: font.fontFamily }}
                >
                  Aa 字
                </div>
              </button>
            )
          })}
        </div>
      </div>


      {/* 预览 */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-ink2">预览</h3>
        <div className="overflow-hidden rounded-token border border-line bg-bg2 px-6 py-10">
          <p
            className="hero-title break-words text-center font-normal text-ink"
            style={{
              fontFamily: previewFont.fontFamily,
              fontSize: `${previewSize}px`,
              lineHeight: 1.05,
              letterSpacing: '-0.03em'
            }}
          >
            {previewText}
          </p>
        </div>
      </div>
    </div>
  )
}
