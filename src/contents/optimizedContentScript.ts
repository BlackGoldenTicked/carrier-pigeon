import { OptimizedDOMQuery } from '../utils/domOptimizer'

/**
 * 优化的Content Script基类
 * 提供通用的性能优化功能
 */
export abstract class OptimizedContentScript {
  protected domOptimizer: OptimizedDOMQuery
  protected isDestroyed = false
  protected observers: MutationObserver[] = []
  protected timeouts: number[] = []
  protected intervals: number[] = []
  
  constructor() {
    this.domOptimizer = new OptimizedDOMQuery()
    this.setupCleanup()
  }

  /**
   * 设置清理机制
   */
  private setupCleanup(): void {
    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
      this.destroy()
    })
    
    // 页面隐藏时暂停操作
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause()
      } else {
        this.resume()
      }
    })
  }

  /**
   * 安全的元素查找
   * @param selectors 选择器数组
   * @param useCache 是否使用缓存
   * @returns 找到的元素或null
   */
  protected findElement(selectors: string[], useCache = true): Element | null {
    if (this.isDestroyed) {
      return null
    }
    
    return this.domOptimizer.findElement(selectors, useCache)
  }

  /**
   * 等待元素出现（优化版）
   * @param selectors 选择器数组
   * @param timeout 超时时间
   * @returns Promise<Element | null>
   */
  protected waitForElement(
    selectors: string[],
    timeout = 10000
  ): Promise<Element | null> {
    if (this.isDestroyed) {
      return Promise.resolve(null)
    }
    
    return this.domOptimizer.waitForElement(selectors, timeout)
  }

  /**
   * 监听DOM变化
   * @param callback 回调函数
   * @param target 监听目标
   */
  protected observeDOM(callback: () => void, target?: Element): void {
    if (this.isDestroyed) return
    
    const observer = new MutationObserver(() => {
      if (!this.isDestroyed) {
        callback()
      }
    })
    
    observer.observe(target || document.body, {
      childList: true,
      subtree: true
    })
    
    this.observers.push(observer)
  }

  /**
   * 安全的超时设置
   * @param callback 回调函数
   * @param delay 延迟时间
   * @returns 超时ID
   */
  protected safeTimeout(callback: () => void, delay: number): number {
    const timeoutId = window.setTimeout(() => {
      if (!this.isDestroyed) {
        callback()
      }
    }, delay)
    
    this.timeouts.push(timeoutId)
    return timeoutId
  }

  /**
   * 安全的间隔设置
   * @param callback 回调函数
   * @param interval 间隔时间
   * @returns 间隔ID
   */
  protected safeInterval(callback: () => void, interval: number): number {
    const intervalId = window.setInterval(() => {
      if (!this.isDestroyed) {
        callback()
      } else {
        clearInterval(intervalId)
      }
    }, interval)
    
    this.intervals.push(intervalId)
    return intervalId
  }

  /**
   * 批量文本注入
   * @param element 目标元素
   * @param text 文本内容
   * @param triggerEvents 是否触发事件
   */
  protected async injectText(
    element: Element,
    text: string,
    triggerEvents = true
  ): Promise<void> {
    if (this.isDestroyed || !element) return
    
    try {
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement
      
      if ('value' in inputElement) {
        inputElement.value = text
      } else {
        element.textContent = text
      }
      
      if (triggerEvents) {
        this.triggerInputEvents(element)
      }
    } catch (error) {
      console.error('文本注入失败:', error)
    }
  }

  /**
   * 触发输入事件
   * @param element 目标元素
   */
  private triggerInputEvents(element: Element): void {
    const events = ['input', 'change', 'keyup', 'keydown']
    
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true })
      element.dispatchEvent(event)
    })
  }

  /**
   * 智能点击
   * @param element 目标元素
   * @param delay 延迟时间
   */
  protected smartClick(element: Element, delay = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed || !element) {
        reject(new Error('元素不存在或脚本已销毁'))
        return
      }
      
      try {
        // 检查元素是否可点击
        const htmlElement = element as HTMLInputElement | HTMLButtonElement
        if ('disabled' in htmlElement && htmlElement.disabled) {
          reject(new Error('元素不可点击'))
          return
        }
        
        // 滚动到视图中
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // 延迟点击
        this.safeTimeout(() => {
          if (!this.isDestroyed) {
            element.dispatchEvent(new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            }))
            resolve()
          }
        }, delay)
        
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 暂停操作
   */
  protected pause(): void {
    // 子类可以重写此方法
  }

  /**
   * 恢复操作
   */
  protected resume(): void {
    // 子类可以重写此方法
  }

  /**
   * 销毁实例，清理所有资源
   */
  public destroy(): void {
    this.isDestroyed = true
    
    // 清理观察者
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    
    // 清理超时
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts = []
    
    // 清理间隔
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
    
    // 清理DOM优化器
    this.domOptimizer.cleanup()
  }

  /**
   * 抽象方法：初始化脚本
   */
  abstract init(): Promise<void>
}