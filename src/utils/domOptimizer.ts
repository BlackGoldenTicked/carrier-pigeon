/**
 * DOM优化工具类
 * 提供高效的DOM查询、监听和缓存机制
 */

/**
 * DOM查询缓存管理器
 */
class DOMQueryCache {
  private cache = new Map<string, { element: Element | null; timestamp: number }>()
  private readonly CACHE_TTL = 5000 // 缓存5秒

  /**
   * 获取缓存的元素
   * @param selector CSS选择器
   * @returns 缓存的元素或null
   */
  get(selector: string): Element | null {
    const cached = this.cache.get(selector)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.element
    }
    return null
  }

  /**
   * 设置缓存
   * @param selector CSS选择器
   * @param element 找到的元素
   */
  set(selector: string, element: Element | null): void {
    this.cache.set(selector, {
      element,
      timestamp: Date.now()
    })
  }

  /**
   * 清除过期缓存
   */
  cleanup(): void {
    const now = Date.now()
    for (const [selector, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.CACHE_TTL) {
        this.cache.delete(selector)
      }
    }
  }
}

/**
 * 高效的DOM查询器
 */
export class OptimizedDOMQuery {
  private cache = new DOMQueryCache()
  private observer: MutationObserver | null = null
  private observerCallbacks = new Set<() => void>()

  constructor() {
    // 定期清理缓存
    setInterval(() => this.cache.cleanup(), 10000)
  }

  /**
   * 检查元素是否可见（优化版）
   * @param element 要检查的元素
   * @returns 是否可见
   */
  isElementVisible(element: Element): boolean {
    if (!element) return false
    
    // 使用 getBoundingClientRect 一次性获取所有信息
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    
    // 批量获取样式属性
    const style = window.getComputedStyle(element)
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0'
  }

  /**
   * 优化的元素查找（带缓存）
   * @param selectors 选择器数组
   * @param useCache 是否使用缓存
   * @returns 找到的元素或null
   */
  findElement(selectors: string[], useCache = true): Element | null {
    for (const selector of selectors) {
      // 检查缓存
      if (useCache) {
        const cached = this.cache.get(selector)
        if (cached && this.isElementVisible(cached)) {
          return cached
        }
      }

      try {
        const element = document.querySelector(selector)
        if (element && this.isElementVisible(element)) {
          if (useCache) {
            this.cache.set(selector, element)
          }
          return element
        }
      } catch (error) {
        // 忽略无效选择器
        console.warn(`Invalid selector: ${selector}`)
      }
    }

    return null
  }

  /**
   * 使用MutationObserver等待元素出现（替代轮询）
   * @param selectors 选择器数组
   * @param timeout 超时时间
   * @returns Promise<Element | null>
   */
  waitForElement(selectors: string[], timeout = 10000): Promise<Element | null> {
    return new Promise((resolve) => {
      // 首先尝试立即查找
      const element = this.findElement(selectors)
      if (element) {
        resolve(element)
        return
      }

      let timeoutId: NodeJS.Timeout
      let resolved = false

      const resolveOnce = (element: Element | null) => {
        if (resolved) return
        resolved = true
        clearTimeout(timeoutId)
        this.stopObserving(checkForElement)
        resolve(element)
      }

      // 设置超时
      timeoutId = setTimeout(() => resolveOnce(null), timeout)

      // 检查元素的函数
      const checkForElement = () => {
        const element = this.findElement(selectors, false) // 不使用缓存，确保实时性
        if (element) {
          resolveOnce(element)
        }
      }

      // 开始观察DOM变化
      this.startObserving(checkForElement)
    })
  }

  /**
   * 开始观察DOM变化
   * @param callback 回调函数
   */
  private startObserving(callback: () => void): void {
    this.observerCallbacks.add(callback)

    if (!this.observer) {
      this.observer = new MutationObserver(() => {
        // 批量执行所有回调
        this.observerCallbacks.forEach(cb => cb())
      })

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden']
      })
    }
  }

  /**
   * 停止观察特定回调
   * @param callback 要移除的回调函数
   */
  private stopObserving(callback: () => void): void {
    this.observerCallbacks.delete(callback)

    if (this.observerCallbacks.size === 0 && this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.observerCallbacks.clear()
    this.cache.cleanup()
  }
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param delay 延迟时间
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}

/**
 * 批量DOM操作
 * @param operations 操作数组
 */
export function batchDOMOperations(operations: (() => void)[]): void {
  // 使用 requestAnimationFrame 批量执行DOM操作
  requestAnimationFrame(() => {
    operations.forEach(op => op())
  })
}

// 导出单例实例
export const domQuery = new OptimizedDOMQuery()