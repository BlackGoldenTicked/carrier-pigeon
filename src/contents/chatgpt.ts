import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

export const config: PlasmoContentScript = {
  matches: ['https://chat.openai.com/*', 'https://chatgpt.com/*']
}

/**
 * ChatGPT优化的Content Script实现
 */
class ChatGPTContentScript extends AIPlatformContentScript {
  private readonly INPUT_SELECTORS = [
    'textarea[data-id="root"]',
    '#prompt-textarea',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Send a message"]',
    'div[contenteditable="true"][data-id="root"]',
    'div[contenteditable="true"] p'
  ]

  private readonly SUBMIT_SELECTORS = [
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
    'button[data-testid="send-button"]',
    'button svg[data-icon="arrow-up"]',
    'button:has(svg[data-icon="arrow-up"])',
    'button:has(svg)',
    '[role="button"][aria-label*="Send"]',
    '[role="button"][aria-label*="send"]',
    'button[type="submit"]'
  ]

  /**
   * 获取ChatGPT特定的输入框选择器
   */
  protected getInputSelectors(): string[] {
    return this.INPUT_SELECTORS
  }

  /**
   * 获取ChatGPT特定的发送按钮选择器
   */
  protected getSubmitSelectors(): string[] {
    return this.SUBMIT_SELECTORS
  }

  /**
   * 验证ChatGPT的发送按钮是否有效
   */
  protected isValidSendButton(button: Element): boolean {
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
    const title = button.getAttribute('title')?.toLowerCase() || ''
    const className = button.className?.toLowerCase() || ''
    const textContent = button.textContent?.trim().toLowerCase() || ''
    
    // 检查ChatGPT特定的发送按钮标识
    if (ariaLabel.includes('send prompt') || 
        ariaLabel.includes('send message') ||
        ariaLabel.includes('send') ||
        title.includes('send')) {
      return true
    }
    
    // 检查data-testid
    if (button.getAttribute('data-testid') === 'send-button') {
      return true
    }
    
    // 检查是否包含发送图标
    const svgElement = button.querySelector('svg[data-icon="arrow-up"]') ||
                      button.querySelector('svg[data-icon="send"]') ||
                      button.querySelector('svg')
    if (svgElement) {
      return true
    }
    
    // 检查父元素是否有发送图标
    const parentButton = button.closest('button')
    if (parentButton && (
        parentButton.querySelector('svg[data-icon="arrow-up"]') ||
        parentButton.querySelector('svg[data-icon="send"]') ||
        parentButton.querySelector('svg')
    )) {
      return true
    }
    
    // 检查按钮类名是否包含发送相关
    if (className.includes('send') || className.includes('submit')) {
      return true
    }
    
    // 检查按钮文本内容
    if (textContent.includes('send') || textContent.includes('发送')) {
      return true
    }
    
    // 检查是否为提交按钮
    if (button.getAttribute('type') === 'submit') {
      return true
    }
    
    return false
  }

  /**
   * 获取平台名称
   */
  protected getPlatformName(): string {
    return 'ChatGPT'
  }

  /**
   * 启用详细日志记录
   */
  protected enableDetailedLogging(): boolean {
    return true
  }
}

// 初始化ChatGPT Content Script
const chatgptScript = new ChatGPTContentScript()
chatgptScript.init()
console.log('[ChatGPT] Content script已加载')