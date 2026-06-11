/**
 * 本机偏好（localStorage，不跨设备同步）
 *
 * - 背景模式：视频 / 图片 / 无，三者互斥的单一状态源
 * - 主题：深 / 浅，未设置时跟随系统
 * - 新手提示条：关闭后不再出现
 */

export type BgMode = 'video' | 'image' | 'none'

const BG_MODE_KEY = 'mytab-bg-mode'
/** 旧版「背景视频开关」key，用于一次性迁移 */
const LEGACY_BG_VIDEO_KEY = 'mytab-bg-video'
const THEME_KEY = 'mytab-theme'
const ONBOARDING_KEY = 'mytab-onboarding-dismissed'

export function readBgMode(): BgMode {
  try {
    const saved = localStorage.getItem(BG_MODE_KEY)
    if (saved === 'video' || saved === 'image' || saved === 'none') {
      return saved
    }
    // 迁移旧偏好：此前仅有「背景视频开关」，关 → none，其余 → video
    const legacyVideoOff = localStorage.getItem(LEGACY_BG_VIDEO_KEY) === '0'
    return legacyVideoOff ? 'none' : 'video'
  } catch {
    return 'video'
  }
}

export function writeBgMode(mode: BgMode): void {
  try {
    localStorage.setItem(BG_MODE_KEY, mode)
  } catch {
    /* 存储不可用时静默降级为会话内生效 */
  }
}

/** 读取主题偏好；未设置时返回 null（跟随系统） */
export function readThemePref(): 'dark' | 'light' | null {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
  } catch {
    /* 忽略 */
  }
  return null
}

export function writeThemePref(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* 存储不可用时静默降级为会话内生效 */
  }
}

/** 解析当前应当使用的主题：用户偏好优先，否则跟随系统 */
export function resolveIsDark(): boolean {
  const pref = readThemePref()
  if (pref) {
    return pref === 'dark'
  }
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function isOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return true
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    /* 忽略 */
  }
}
