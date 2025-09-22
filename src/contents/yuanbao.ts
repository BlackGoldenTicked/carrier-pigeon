import type { PlasmoContentScript } from "plasmo"
import { OptimizedContentScript } from './optimizedContentScript'

export const config: PlasmoContentScript = {
  matches: ['https://yuanbao.tencent.com/*', 'https://www.yuanbao.tencent.com/*']
}

/**
 * 元宝优化的Content Script实现
 */
class YuanbaoContentScript extends OptimizedContentScript {
  private readonly INPUT_SELECTORS = [
    'textarea[placeholder*="请输入"]',
    'textarea[placeholder*="输入消息"]',
    'div[contenteditable="true"]',
    'div[role="textbox"]',
    'input[type="text"]'
  ]

  private readonly SUBMIT_SELECTORS = [
    'button[aria-label="发送"]',
    'button:has(svg[data-icon="send"])',
    'button svg[data-icon="send"]',
    'button[type="submit"]',
    'button:contains("发送")',
    'div[role="button"]:contains("发送")'
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
    
    // 检查元宝特定的发送按钮
    if (ariaLabel.includes('发送') || textContent.includes('发送')) {
      return true
    }
    
    // 检查是否包含发送图标
    const svgElement = button.querySelector('svg[data-icon="send"]')
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
   * 初始化元宝Content Script
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
      console.error('[元宝] 填充并发送失败:', error)
      return false
    }
  }
}

// 初始化元宝Content Script
const yuanbaoScript = new YuanbaoContentScript()
yuanbaoScript.init()
console.log('[元宝] Content script已加载')