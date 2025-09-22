import type { PlasmoContentScript } from "plasmo"
import { OptimizedContentScript } from './optimizedContentScript'

export const config: PlasmoContentScript = {
  matches: ['https://claude.ai/*']
}

/**
 * Claude优化的Content Script实现
 */
class ClaudeContentScript extends OptimizedContentScript {
  private readonly INPUT_SELECTORS = [
    'div[contenteditable="true"][role="textbox"][aria-label="Write your prompt to Claude"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"] p',
    'div[contenteditable="true"]',
    'textarea[placeholder*="Talk to Claude"]',
    'div[role="textbox"]'
  ]

  private readonly SUBMIT_SELECTORS = [
    'button[aria-label="Send message"]',
    'button[aria-label="Send Message"]',
    'button:has(svg[data-icon="arrow-up"])',
    'button svg[data-icon="arrow-up"]',
    'button[type="submit"]'
  ]

  protected getInputSelectors(): string[] {
    return this.INPUT_SELECTORS
  }

  protected getSubmitSelectors(): string[] {
    return this.SUBMIT_SELECTORS
  }

  protected isValidSendButton(button: Element): boolean {
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
    const textContent = button.textContent?.trim().toLowerCase() || ''
    
    // 检查Claude特定的发送按钮
    if (ariaLabel.includes('send message') || ariaLabel.includes('send')) {
      return true
    }
    
    // 检查是否包含发送图标
    const svgElement = button.querySelector('svg[data-icon="arrow-up"]')
    if (svgElement) {
      return true
    }
    
    // 检查是否为提交按钮
    if (button.getAttribute('type') === 'submit') {
      return true
    }
    
    return false
  }

  /**
   * 初始化Claude Content Script
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
        console.log('[Claude] 未找到输入框')
        return false
      }

      await this.injectText(inputElement, text)
      console.log('[Claude] 文本填充成功')
      return true
    } catch (error) {
      console.error('[Claude] 填充文本失败:', error)
      return false
    }
  }

  /**
   * 处理自动发送请求
   */
  private async handleAutoSend(): Promise<boolean> {
    try {
      const sendButton = await this.waitForElementWithFilter(
        this.getSubmitSelectors(),
        this.isValidSendButton.bind(this),
        5000
      )

      if (!sendButton) {
        console.log('[Claude] 未找到有效的发送按钮')
        return false
      }

      if (!this.isElementVisible(sendButton)) {
        console.log('[Claude] 发送按钮不可见')
        return false
      }

      await this.smartClick(sendButton)
      console.log('[Claude] 自动发送成功')
      return true
    } catch (error) {
      console.error('[Claude] 自动发送失败:', error)
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
      console.log(`🔍 [DEBUG] Claude content script收到消息:`, request)
      
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
   * 处理填充文本并发送
   */
  private async handleFillAndSend(text: string): Promise<boolean> {
    try {
      const fillSuccess = await this.handleFillText(text)
      if (!fillSuccess) {
        return false
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      return await this.handleAutoSend()
    } catch (error) {
      console.error('[Claude] 填充并发送失败:', error)
      return false
    }
  }
}

// 初始化Claude Content Script
const claudeScript = new ClaudeContentScript()
claudeScript.init()
console.log('[Claude] Content script已加载')