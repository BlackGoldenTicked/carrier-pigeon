import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind CSS 类名，避免冲突
 * @param inputs - 类名数组
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 延迟执行函数
 * @param ms - 延迟毫秒数
 * @returns Promise
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 生成随机 ID
 * @param length - ID 长度
 * @returns 随机字符串
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 格式化日期
 * @param date - 日期对象
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * 检查是否为有效的 URL
 * @param string - 待检查的字符串
 * @returns 是否为有效 URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

/**
 * 获取网站图标 URL
 * @param url - 网站 URL
 * @returns 图标 URL
 */
export function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return '/icons/default-favicon.png'
  }
}

/**
 * 截断文本
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}