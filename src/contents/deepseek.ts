import type { PlasmoContentScript } from "plasmo"
import { OptimizedContentScript } from './optimizedContentScript'

export const config: PlasmoContentScript = {
  matches: ['https://chat.deepseek.com/*', 'https://www.deepseek.com/*']
}

/**
 * DeepSeek优化的Content Script实现
 */
class DeepSeekContentScript extends OptimizedContentScript {
  private readonly INPUT_SELECTORS = [
    // 最新版 DeepSeek UI - 精确匹配
    'textarea._17e543b._7436101',
    'textarea._17e543b',
    'textarea._7436101',
    // 旧版选择器（保持兼容性）
    'textarea[placeholder*="Send a message"]',
    'textarea[placeholder*="输入消息"]',
    'div[contenteditable="true"]',
    'div[role="textbox"]'
  ]

  private readonly SUBMIT_SELECTORS = [
    // 最新版 DeepSeek UI - 精确匹配
    'div._17e543b._7436101[role="button"]:not([aria-disabled="true"])',
    'div._17e543b[role="button"]:not([aria-disabled="true"])',
    'div._7436101[role="button"]:not([aria-disabled="true"])',
    // 包含发送图标的按钮
    'div[role="button"]:not([aria-disabled="true"]) svg[viewBox="0 0 16 16"] path[d*="M8.3125"]',
    'div[role="button"]:not([aria-disabled="true"]) svg[viewBox="0 0 16 16"]',
    'div[role="button"]:not([aria-disabled="true"]) .ds-icon',
    // 其他新版选择器
    'div.bcc55ca1[role="button"]:not([aria-disabled="true"])',
    'div._308c14b[role="button"]:not([aria-disabled="true"])',
    // 旧版选择器（保持兼容性）
    'button[aria-label="Send message"]',
    'button:has(svg[data-icon="send"])',
    'button svg[data-icon="send"]',
    'button[type="submit"]'
  ]

  protected getInputSelectors(): string[] {
    return this.INPUT_SELECTORS
  }

  protected getSubmitSelectors(): string[] {
    return this.SUBMIT_SELECTORS
  }

  protected isValidSendButton(button: Element): boolean {
    // 检查是否被禁用
    if (button.getAttribute('aria-disabled') === 'true') {
      return false
    }
    
    // 检查是否包含发送图标
    const svgElement = button.querySelector('svg[viewBox="0 0 16 16"]')
    if (svgElement) {
      return true
    }
    
    // 检查是否有ds-icon类
    const iconElement = button.querySelector('.ds-icon')
    if (iconElement) {
      return true
    }
    
    // 检查特定的类名
    const classList = button.classList
    if (classList.contains('_17e543b') || classList.contains('_7436101') || 
        classList.contains('bcc55ca1') || classList.contains('_308c14b')) {
      return true
    }
    
    // 检查aria-label
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
    if (ariaLabel.includes('send message') || ariaLabel.includes('发送')) {
      return true
    }
    
    return false
  }

  /**
   * 初始化DeepSeek Content Script
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
         return false
       }
 
       await this.injectText(inputElement as HTMLElement, text)
       return true
     } catch (error) {
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
         return false
       }
 
       if (!this.isElementVisible(sendButton)) {
         return false
       }
 
       await this.smartClick(sendButton)
       return true
     } catch (error) {
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
      console.error('[DeepSeek] 填充并发送失败:', error)
      return false
    }
  }
}

// 初始化DeepSeek Content Script
const deepseekScript = new DeepSeekContentScript()
deepseekScript.init()
console.log('[DeepSeek] Content script已加载')