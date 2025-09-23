import { FontConfig, FontSettings } from '../types'

/**
 * 字体CSS注入器类
 * 负责动态加载和应用字体样式
 */
export class FontInjector {
  private static instance: FontInjector
  private loadedFonts: Set<string> = new Set()
  private currentStyleElement: HTMLStyleElement | null = null
  private fontLinkElements: Map<string, HTMLLinkElement> = new Map()
  private fontLoadPromises: Map<string, Promise<void>> = new Map()
  private isInitialized: boolean = false

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): FontInjector {
    if (!FontInjector.instance) {
      FontInjector.instance = new FontInjector()
    }
    return FontInjector.instance
  }

  /**
   * 加载字体CSS文件
   */
  async loadFont(font: FontConfig): Promise<void> {
    if (this.loadedFonts.has(font.id)) {
      return
    }

    // 如果没有CSS URL，直接使用系统字体
    if (!font.cssUrl) {
      this.loadedFonts.add(font.id)
      console.log(`Using system font: ${font.displayName}`)
      return
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = font.cssUrl
      link.id = `font-${font.id}`
      
      // 设置超时处理
      const timeout = setTimeout(() => {
        console.warn(`Font loading timeout: ${font.displayName}, falling back to system font`)
        this.loadedFonts.add(font.id)
        resolve() // 不拒绝，而是继续使用系统字体
      }, 5000) // 5秒超时
      
      link.onload = () => {
        clearTimeout(timeout)
        this.loadedFonts.add(font.id)
        this.fontLinkElements.set(font.id, link)
        console.log(`Font loaded: ${font.displayName}`)
        resolve()
      }
      
      link.onerror = () => {
        clearTimeout(timeout)
        console.warn(`Failed to load font CDN: ${font.displayName}, falling back to system font`)
        // 移除失败的link元素
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
        // 标记为已加载，使用系统字体作为备用
        this.loadedFonts.add(font.id)
        resolve() // 不拒绝，而是继续使用系统字体
      }
      
      document.head.appendChild(link)
    })
  }

  /**
   * 卸载字体CSS文件
   */
  unloadFont(fontId: string): void {
    const linkElement = this.fontLinkElements.get(fontId)
    if (linkElement && linkElement.parentNode) {
      linkElement.parentNode.removeChild(linkElement)
      this.fontLinkElements.delete(fontId)
      this.loadedFonts.delete(fontId)
      console.log(`Font unloaded: ${fontId}`)
    }
  }

  /**
   * 同步应用字体设置到页面（立即生效，无闪烁）
   * @param font 字体配置
   * @param settings 字体设置
   */
  applySyncFontSettings(font: FontConfig, settings: FontSettings): void {
    try {
      // 移除之前的样式
      this.removeCurrentStyles()

      // 创建新的样式元素
      const style = document.createElement('style')
      style.id = 'custom-font-styles'
      
      const css = this.generateFontCSS(font, settings)
      style.textContent = css
      
      // 立即插入到head的最前面，确保优先级
      document.head.insertBefore(style, document.head.firstChild)
      this.currentStyleElement = style
      
      // 如果字体需要外部CSS，异步加载但不等待
      if (font.cssUrl && !this.loadedFonts.has(font.id)) {
        this.loadFont(font).catch(error => {
          console.warn(`Failed to load font ${font.displayName}:`, error)
        })
      }
      
      console.log(`Sync applied font: ${font.displayName}`)
    } catch (error) {
      console.error('Failed to sync apply font settings:', error)
    }
  }

  /**
   * 异步应用字体设置到页面（等待字体加载完成）
   */
  async applyFontSettings(font: FontConfig, settings: FontSettings): Promise<void> {
    try {
      // 加载字体（如果需要）
      if (font.cssUrl) {
        await this.loadFont(font)
      }

      // 移除之前的样式
      this.removeCurrentStyles()

      // 创建新的样式元素
      const style = document.createElement('style')
      style.id = 'custom-font-styles'
      
      const css = this.generateFontCSS(font, settings)
      style.textContent = css
      
      document.head.appendChild(style)
      this.currentStyleElement = style
      
      console.log(`Applied font: ${font.displayName}`)
    } catch (error) {
      console.error('Failed to apply font settings:', error)
    }
  }

  /**
   * 生成字体CSS规则
   */
  private generateFontCSS(font: FontConfig, settings: FontSettings): string {
    const { fontFamily, fontWeight = '400' } = font
    const { fontSize, lineHeight } = settings
    
    return `
      /* 全局字体设置 */
      * {
        font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      }
      
      /* 基础元素字体设置 */
      body, html {
        font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        font-weight: ${fontWeight} !important;
      }
      
      /* 标题元素 */
      h1, h2, h3, h4, h5, h6 {
        font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        font-weight: ${fontWeight} !important;
      }
      
      /* 段落和文本元素 */
      p, span, div, a, li, td, th, label, input, textarea, button {
        font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        font-weight: ${fontWeight} !important;
      }
      
      /* 特定模式下的字体优化 */
      .normal-mode * {
        font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      }
      
      .pro-mode * {
        font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      }
      
      .minimal-mode * {
        font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      }
      
      /* 确保动画和特效组件的字体一致性 */
      .moving-border *, .animated-border *, .mode-selector * {
        font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        font-weight: ${fontWeight} !important;
      }
      
      /* 保持等宽字体的元素 */
      code, pre, kbd, samp, tt, var {
        font-family: ${font.category === 'monospace' ? fontFamily : "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace"} !important;
      }
      
      /* 确保在不同背景下的字体渲染质量 */
      * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
    `
  }

  /**
   * 移除当前应用的样式
   */
  private removeCurrentStyles(): void {
    if (this.currentStyleElement && this.currentStyleElement.parentNode) {
      this.currentStyleElement.parentNode.removeChild(this.currentStyleElement)
      this.currentStyleElement = null
    }
  }



  /**
   * 初始化字体注入器
   * @param enabledFont 当前启用的字体
   * @param settings 字体设置
   */
  initialize(enabledFont?: FontConfig, settings?: FontSettings): void {
    if (this.isInitialized) return
    
    try {
      // 如果有启用的字体，立即同步应用
      if (enabledFont && settings) {
        this.applySyncFontSettings(enabledFont, settings)
      }
      
      this.isInitialized = true
      console.log('FontInjector initialized')
    } catch (error) {
      console.error('Failed to initialize FontInjector:', error)
    }
  }

  /**
   * 预加载多个字体
   */
  async preloadFonts(fonts: FontConfig[]): Promise<void> {
    const loadPromises = fonts
      .filter(font => font.cssUrl && !this.loadedFonts.has(font.id))
      .map(font => this.preloadFont(font))
    
    await Promise.allSettled(loadPromises)
  }

  /**
   * 预加载单个字体（带缓存）
   */
  async preloadFont(font: FontConfig): Promise<void> {
    if (!font.cssUrl) return
    
    // 如果已经有加载Promise，直接返回
    if (this.fontLoadPromises.has(font.id)) {
      return this.fontLoadPromises.get(font.id)!
    }
    
    // 创建加载Promise并缓存
    const loadPromise = this.loadFont(font)
    this.fontLoadPromises.set(font.id, loadPromise)
    
    try {
      await loadPromise
    } catch (error) {
      // 加载失败时移除缓存，允许重试
      this.fontLoadPromises.delete(font.id)
      throw error
    }
  }

  /**
   * 清理所有字体资源
   */
  cleanup(): void {
    // 移除样式
    this.removeCurrentStyles()
    
    // 移除所有字体链接
    this.fontLinkElements.forEach((link, fontId) => {
      this.unloadFont(fontId)
    })
    
    this.loadedFonts.clear()
    this.fontLinkElements.clear()
  }

  /**
   * 检查字体是否已加载
   */
  isFontLoaded(fontId: string): boolean {
    return this.loadedFonts.has(fontId)
  }

  /**
   * 获取已加载的字体列表
   */
  getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts)
  }
}

/**
 * 导出单例实例
 */
export const fontInjector = FontInjector.getInstance()