/**
 * 应用配置存储层（chrome.storage.sync）
 *
 * - 链接与模型分 key 存储，避免单项撞上 sync 8KB/项 配额
 * - 自动从旧版单 key（mytab-config）迁移
 * - 模型列表与 JSON 默认配置智能合并：扩展更新新增的模型自动出现，用户的启用状态保留
 */

import { getQuickLinks, getAIModels } from './configLoader'

export interface QuickLinkItem {
  id: number
  title: string
  url: string
  /** 网站图标 URL，可选 */
  icon?: string
}

export interface AIModelItem {
  id: string
  name: string
  type: 'language' | 'multimedia'
  url: string
  enabled: boolean
  selectedColor?: string
}

export interface AppConfig {
  links: QuickLinkItem[]
  models: AIModelItem[]
}

export const MAX_LINKS = 20

const LINKS_KEY = 'mytab-links'
const MODELS_KEY = 'mytab-models'
const LEGACY_KEY = 'mytab-config'

/** JSON 默认链接（扁平化，旧配置是按行分组的二维数组） */
function defaultLinks(): QuickLinkItem[] {
  return getQuickLinks()
    .flat()
    .map((link) => ({ id: link.id, title: link.title, url: link.url, icon: link.icon }))
}

/** JSON 默认模型 */
function defaultModels(): AIModelItem[] {
  return getAIModels().flatMap((category) =>
    category.models.map((model) => ({
      id: model.id,
      name: model.name,
      type: model.type as 'language' | 'multimedia',
      url: model.url,
      enabled: true,
      selectedColor: model.selectedColor
    }))
  )
}

/** 合并模型：以 JSON 为基准（保证更新后新模型出现），叠加用户的启用状态 */
function mergeModels(stored: AIModelItem[] | undefined): AIModelItem[] {
  const base = defaultModels()
  if (!stored || stored.length === 0) {
    return base
  }
  const storedMap = new Map(stored.map((m) => [m.id, m]))
  return base.map((jsonModel) => {
    const userModel = storedMap.get(jsonModel.id)
    return userModel
      ? { ...jsonModel, enabled: userModel.enabled, selectedColor: userModel.selectedColor ?? jsonModel.selectedColor }
      : jsonModel
  })
}

function sanitizeLinks(raw: unknown): QuickLinkItem[] | null {
  if (!Array.isArray(raw)) {
    return null
  }
  const links = raw.filter(
    (l): l is QuickLinkItem =>
      l && typeof l === 'object' && typeof (l as QuickLinkItem).url === 'string' && typeof (l as QuickLinkItem).title === 'string'
  )
  return links.slice(0, MAX_LINKS)
}

/**
 * 加载配置；首次调用时自动迁移旧版单 key 数据
 */
export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const result = await chrome.storage.sync.get([LINKS_KEY, MODELS_KEY, LEGACY_KEY])

    let links = sanitizeLinks(result[LINKS_KEY])
    let models = Array.isArray(result[MODELS_KEY]) ? (result[MODELS_KEY] as AIModelItem[]) : null

    // 迁移旧版 mytab-config：{ links: 二维数组, basicModels, theme }
    const legacy = result[LEGACY_KEY]
    if ((!links || !models) && legacy && typeof legacy === 'object') {
      if (!links && Array.isArray(legacy.links)) {
        links = sanitizeLinks(legacy.links.flat())
      }
      if (!models && Array.isArray(legacy.basicModels)) {
        models = legacy.basicModels as AIModelItem[]
      }
      const migrated: AppConfig = {
        links: links ?? defaultLinks(),
        models: mergeModels(models ?? undefined)
      }
      await chrome.storage.sync.set({ [LINKS_KEY]: migrated.links, [MODELS_KEY]: migrated.models })
      await chrome.storage.sync.remove(LEGACY_KEY)
      return migrated
    }

    return {
      links: links ?? defaultLinks(),
      models: mergeModels(models ?? undefined)
    }
  } catch {
    // storage 不可用（如非扩展环境）时回退到 JSON 默认值
    return { links: defaultLinks(), models: defaultModels() }
  }
}

export async function saveLinks(links: QuickLinkItem[]): Promise<void> {
  await chrome.storage.sync.set({ [LINKS_KEY]: links.slice(0, MAX_LINKS) })
}

export async function saveModels(models: AIModelItem[]): Promise<void> {
  await chrome.storage.sync.set({ [MODELS_KEY]: models })
}

/**
 * 订阅配置变化（其他页面修改时实时同步）；返回取消订阅函数
 */
export function subscribeAppConfig(callback: (partial: Partial<AppConfig>) => void): () => void {
  const handler = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area !== 'sync') {
      return
    }
    const partial: Partial<AppConfig> = {}
    if (changes[LINKS_KEY]?.newValue) {
      const links = sanitizeLinks(changes[LINKS_KEY].newValue)
      if (links) {
        partial.links = links
      }
    }
    if (changes[MODELS_KEY]?.newValue) {
      partial.models = mergeModels(changes[MODELS_KEY].newValue as AIModelItem[])
    }
    if (partial.links || partial.models) {
      callback(partial)
    }
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}

/** 从 URL 提取域名 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

/** 网站图标 URL（Google favicon 服务） */
export function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${extractDomain(url)}&sz=64`
}

/** 从域名推导默认标题（github.com → Github） */
export function deriveTitle(url: string): string {
  const domain = extractDomain(url)
  const name = domain.split('.')[0] || domain
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** 校验是否为可打开的 http(s) 地址（允许省略协议） */
export function normalizeHttpUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withProtocol)
    if (!parsed.hostname.includes('.')) {
      return null
    }
    return parsed.href
  } catch {
    return null
  }
}
