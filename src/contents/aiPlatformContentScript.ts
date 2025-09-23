import { OptimizedContentScript } from './optimizedContentScript'

/**
 * AI平台Content Script的通用基类
 * 提供统一的文本填充、自动发送等功能
 */
export abstract class AIPlatformContentScript extends OptimizedContentScript {
  
  /**
   * 获取平台特定的输入框选择器
   */
  protected abstract getInputSelectors(): string[]

  /**
   * 获取平台特定的发送按钮选择器
   */
  protected abstract getSubmitSelectors(): string[]

  /**
   * 验证发送按钮是否有效（平台特定逻辑）
   */
  protected abstract isValidSendButton(button: Element): boolean

  /**
   * 获取平台名称（用于日志）
   */
  protected abstract getPlatformName(): string

  /**
   * 是否启用详细日志
   */
  protected enableDetailedLogging(): boolean {
    return false
  }

  /**
   * 初始化Content Script
   */
  async init(): Promise<void> {
    this.setupMessageListener()
  }

  /**
   * 处理填充文本请求
   */
  private async handleFillText(text: string): Promise<boolean> {
    try {
      const inputElement = await this.waitForElement(this.getInputSelectors(), 5000)
      if (!inputElement) {
        this.log('未找到输入框')
        return false
      }

      await this.injectText(inputElement as HTMLElement, text)
      this.log('文本填充成功')
      return true
    } catch (error) {
      this.logError('填充文本失败:', error)
      return false
    }
  }

  /**
   * 处理自动发送请求
   */
  private async handleAutoSend(): Promise<boolean> {
    try {
      this.log('开始查找发送按钮...')
      this.log(`使用的选择器: ${this.getSubmitSelectors().join(', ')}`)
      
      const sendButton = await this.waitForElementWithFilter(
        this.getSubmitSelectors(),
        this.isValidSendButton.bind(this),
        5000
      )

      if (!sendButton) {
        this.log('未找到有效的发送按钮')
        // 调试：列出所有找到的按钮
        if (this.enableDetailedLogging()) {
          this.debugAllButtons()
        }
        return false
      }

      this.log(`找到发送按钮: ${sendButton.tagName}`)
      this.log(`按钮aria-label: ${sendButton.getAttribute('aria-label') || '无'}`)
      this.log(`按钮class: ${sendButton.className || '无'}`)

      if (!this.isElementVisible(sendButton)) {
        this.log('发送按钮不可见')
        return false
      }

      this.log('准备点击发送按钮...')
      await this.smartClick(sendButton)
      this.log('自动发送成功')
      return true
    } catch (error) {
      this.logError('自动发送失败:', error)
      return false
    }
  }

  /**
   * 处理填充文本并发送
   */
  private async handleFillAndSend(text: string): Promise<boolean> {
    try {
      const fillSuccess = await this.handleFillText(text)
      if (!fillSuccess) {
        return false
      }

      // 等待一段时间确保文本已填充
      await new Promise(resolve => setTimeout(resolve, 500))
      return await this.handleAutoSend()
    } catch (error) {
      this.logError('填充并发送失败:', error)
      return false
    }
  }

  /**
   * 等待符合条件的元素出现
   */
  private async waitForElementWithFilter(
    selectors: string[],
    filter: (element: Element) => boolean,
    timeout: number = 5000
  ): Promise<Element | null> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector)
        for (const element of elements) {
          if (filter(element)) {
            return element
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return null
  }

  /**
   * 检查元素是否可见
   */
  private isElementVisible(element: Element): boolean {
    const htmlElement = element as HTMLElement
    const rect = htmlElement.getBoundingClientRect()
    const style = window.getComputedStyle(htmlElement)
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0'
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (this.enableDetailedLogging()) {
        console.log(`🔍 [DEBUG] ${this.getPlatformName()} content script收到消息:`, request)
      }
      
      if (request.action === 'fillText') {
        this.handleFillText(request.text).then(sendResponse)
        return true
      } else if (request.action === 'autoSend') {
        this.handleAutoSend().then(sendResponse)
        return true
      } else if (request.action === 'fillAndSend' || request.action === 'autoFillAndSend') {
        this.handleFillAndSend(request.text).then(sendResponse)
        return true
      }
    })
  }

  /**
   * 调试所有按钮信息
   */
  private debugAllButtons(): void {
    const allButtons = document.querySelectorAll('button, [role="button"]')
    this.log(`页面共找到 ${allButtons.length} 个按钮`)
    
    allButtons.forEach((button, index) => {
      const ariaLabel = button.getAttribute('aria-label') || '无'
      const className = button.className || '无'
      const textContent = button.textContent?.trim() || '无'
      const dataTestId = button.getAttribute('data-testid') || '无'
      const hasIcon = button.querySelector('svg') ? '有图标' : '无图标'
      
      this.log(`按钮${index + 1}: aria-label="${ariaLabel}", class="${className}", text="${textContent}", data-testid="${dataTestId}", ${hasIcon}`)
    })
  }

  /**
   * 输出日志信息
   */
  private log(message: string): void {
    if (this.enableDetailedLogging()) {
      console.log(`[${this.getPlatformName()}] ${message}`)
    }
  }

  /**
   * 输出错误日志
   */
  private logError(message: string, error?: any): void {
    console.error(`[${this.getPlatformName()}] ${message}`, error)
  }
}