import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

export const config: PlasmoContentScript = {
  matches: ['https://claude.ai/*']
}

/**
 * Claude优化的Content Script实现
 */
class ClaudeContentScript extends AIPlatformContentScript {
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

  /**
   * 获取Claude特定的输入框选择器
   */
  protected getInputSelectors(): string[] {
    return this.INPUT_SELECTORS
  }

  /**
   * 获取Claude特定的发送按钮选择器
   */
  protected getSubmitSelectors(): string[] {
    return this.SUBMIT_SELECTORS
  }

  /**
   * 验证Claude的发送按钮是否有效
   */
  protected isValidSendButton(button: Element): boolean {
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
    
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
   * 获取平台名称
   */
  protected getPlatformName(): string {
    return 'Claude'
  }

  /**
   * 启用详细日志记录
   */
  protected enableDetailedLogging(): boolean {
    return true
  }
}

// 初始化Claude Content Script
const claudeScript = new ClaudeContentScript()
claudeScript.init()
console.log('[Claude] Content script已加载')