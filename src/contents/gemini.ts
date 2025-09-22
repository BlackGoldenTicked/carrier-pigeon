import type { PlasmoContentScript } from "plasmo"
import { OptimizedContentScript } from './optimizedContentScript'

export const config: PlasmoContentScript = {
  matches: ['https://gemini.google.com/*', 'https://bard.google.com/*']
}

/**
 * Gemini优化的Content Script实现
 */
class GeminiContentScript extends OptimizedContentScript {
  private readonly INPUT_SELECTORS = [
    // 新版 Gemini UI
    'div.ql-editor.textarea.new-input-ui[contenteditable="true"][role="textbox"]',
    'div.ql-editor[contenteditable="true"][aria-label*="输入提示"]',
    'div.ql-editor[contenteditable="true"][data-placeholder*="Gemini"]',
    // 旧版选择器保持兼容
    'rich-textarea[placeholder*="Enter a prompt here"]',
    'div[contenteditable="true"][data-placeholder*="Enter a prompt"]',
    'div[contenteditable="true"] p',
    'textarea[placeholder*="Enter a prompt"]',
    'div[role="textbox"]'
  ]

  private readonly SUBMIT_SELECTORS = [
    // 新版 Gemini UI
    'button.send-button[aria-label="发送"]',
    'button.submit[aria-label="发送"]',
    'button.mdc-icon-button.send-button',
    'button.mat-mdc-icon-button.send-button',
    // 旧版选择器保持兼容
    'button[aria-label*="Send message"]',
    'button:has(mat-icon[data-mat-icon-name="send"])',
    'button mat-icon[data-mat-icon-name="send"]',
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
    const matIcon = button.querySelector('mat-icon[data-mat-icon-name="send"]')
    if (matIcon) {
      return true
    }
    
    // 检查特定的类名
    const classList = button.classList
    if (classList.contains('send-button') || classList.contains('submit') ||
        classList.contains('mdc-icon-button') || classList.contains('mat-mdc-icon-button')) {
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
   * 初始化Gemini Content Script
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
      console.error('[Gemini] 填充并发送失败:', error)
      return false
    }
  }
}

// 初始化Gemini Content Script
const geminiScript = new GeminiContentScript()
geminiScript.init()
console.log('[Gemini] Content script已加载')