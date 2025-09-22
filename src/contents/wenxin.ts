import type { PlasmoContentScript } from "plasmo"
import { OptimizedContentScript } from './optimizedContentScript'

export const config: PlasmoContentScript = {
  matches: [
    "https://yiyan.baidu.com/*",
    "https://chat.baidu.com/*",
    "https://wenxin.baidu.com/*"
  ]
}

/**
 * 文心一言优化的Content Script实现
 */
class WenxinContentScript extends OptimizedContentScript {
  private readonly INPUT_SELECTORS = [
    'textarea[placeholder*="请输入你想问的问题"]',
    'textarea[placeholder*="输入消息"]',
    'div[contenteditable="true"]',
    'div[role="textbox"]'
  ]

  private readonly SUBMIT_SELECTORS = [
    // 最新版文心一言发送按钮 - 2024年最新结构
    'span.sendInner__xCktUkDO.sendBtnLottie__CGcl6VqG',
    'span.sendInner__xCktUkDO',
    'span.sendBtnLottie__CGcl6VqG',
    // 包含特定SVG的发送按钮
    'span.sendInner__xCktUkDO:has(svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 100 100"])',
    'span.sendBtnLottie__CGcl6VqG:has(svg[preserveAspectRatio="xMidYMid meet"])',
    'span:has(svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 100 100"][preserveAspectRatio="xMidYMid meet"])',
    // 传统版本文心一言发送按钮
    'div.send__oauXtNY3',
    'div.btnContainer__TRj9p0ui',
    // 包含Lottie动画的发送按钮
    'div.send__oauXtNY3 div.btnContainer__TRj9p0ui',
    'div.btnContainer__TRj9p0ui span.sendInner__xCktUkDO',
    // 更广泛的类名模式匹配
    'div[class*="send"]',
    'span[class*="send"]',
    'div[class*="btn"][class*="container"]',
    'span[class*="btn"][class*="inner"]',
    'div[class*="submit"]',
    'span[class*="submit"]',
    // SVG相关选择器
    'div:has(svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 100 100"])',
    'span:has(svg[preserveAspectRatio="xMidYMid meet"])',
    'div:has(svg[viewBox="0 0 100 100"])',
    'span:has(svg[viewBox="0 0 100 100"])',
    // 通用发送按钮模式
    '*[class*="send"][class*="btn"]',
    '*[class*="send"][class*="button"]',
    '*[class*="submit"][class*="btn"]',
    '*[class*="submit"][class*="button"]',
    // 可点击元素模式
    'div[onclick*="send"]',
    'span[onclick*="send"]',
    'div[onclick*="submit"]',
    'span[onclick*="submit"]',
    // 传统选择器（保持兼容性）
    'button[aria-label="发送"]',
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
    const className = button.className || ''
    const textContent = button.textContent?.trim() || ''
    const ariaLabel = button.getAttribute('aria-label') || ''
    
    // 1. 检查文心一言特定的类名（最新版本优先）
    if (className.includes('sendInner__xCktUkDO') && className.includes('sendBtnLottie__CGcl6VqG')) {
      return true
    }
    
    if (className.includes('sendInner__xCktUkDO') || 
        className.includes('sendBtnLottie__CGcl6VqG') ||
        className.includes('send__oauXtNY3') || 
        className.includes('btnContainer__TRj9p0ui')) {
      return true
    }
    
    // 2. 检查通用发送相关的类名模式
    const sendPatterns = ['send', 'submit', '发送', '提交']
    const btnPatterns = ['btn', 'button', 'click']
    
    const hasSendPattern = sendPatterns.some(pattern => 
      className.toLowerCase().includes(pattern.toLowerCase()) ||
      textContent.toLowerCase().includes(pattern.toLowerCase()) ||
      ariaLabel.toLowerCase().includes(pattern.toLowerCase())
    )
    
    const hasBtnPattern = btnPatterns.some(pattern => 
      className.toLowerCase().includes(pattern.toLowerCase())
    )
    
    if (hasSendPattern && (hasBtnPattern || button.tagName === 'BUTTON')) {
      return true
    }
    
    // 3. 检查是否包含SVG
    const svgElement = button.querySelector('svg')
    if (svgElement) {
      return true
    }
    
    return false
  }

  /**
   * 点击发送按钮的专用方法
   */
  private async clickSendButton(button: Element): Promise<boolean> {
    const element = button as HTMLElement
    
    try {
      // 方法1: 针对最新版按钮结构
      if (element.classList.contains('sendInner__xCktUkDO') && element.classList.contains('sendBtnLottie__CGcl6VqG')) {
        element.click()
        return true
      }
    } catch (error) {
      console.log('文心一言: 方法1失败，尝试方法2')
    }
    
    try {
      // 方法2: 查找并点击最新版按钮结构
      const latestButton = element.querySelector('.sendInner__xCktUkDO.sendBtnLottie__CGcl6VqG') ||
                          element.closest('.sendInner__xCktUkDO.sendBtnLottie__CGcl6VqG')
      if (latestButton) {
        ;(latestButton as HTMLElement).click()
        return true
      }
    } catch (error) {
      console.log('文心一言: 方法2失败，尝试方法3')
    }
    
    try {
      // 方法3: 使用基类的智能点击方法
      await this.smartClick(button)
      return true
    } catch (error) {
      console.log('文心一言: 智能点击失败:', error)
      return false
    }
  }

  /**
   * 初始化文心一言Content Script
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
        console.log('[文心一言] 未找到输入框')
        return false
      }

      await this.injectText(inputElement, text)
      console.log('[文心一言] 文本填充成功')
      return true
    } catch (error) {
      console.error('[文心一言] 填充文本失败:', error)
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
        console.log('[文心一言] 未找到有效的发送按钮')
        return false
      }

      if (!this.isElementVisible(sendButton)) {
        console.log('[文心一言] 发送按钮不可见')
        return false
      }

      const success = await this.clickSendButton(sendButton)
      if (success) {
        console.log('[文心一言] 自动发送成功')
      }
      return success
    } catch (error) {
      console.error('[文心一言] 自动发送失败:', error)
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
      } else if (request.action === 'fillAndSend') {
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
      console.error('[文心一言] 填充并发送失败:', error)
      return false
    }
  }
}

// 初始化文心一言Content Script
const wenxinScript = new WenxinContentScript()
wenxinScript.init()
console.log('[文心一言] Content script已加载')