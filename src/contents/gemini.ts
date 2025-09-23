import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

export const config: PlasmoContentScript = {
  matches: ['https://gemini.google.com/*', 'https://bard.google.com/*']
}

/**
 * Gemini AI平台的Content Script实现
 */
class GeminiContentScript extends AIPlatformContentScript {
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

  /**
   * 获取输入框选择器
   */
  protected getInputSelectors(): string[] {
    return this.INPUT_SELECTORS
  }

  /**
   * 获取发送按钮选择器
   */
  protected getSubmitSelectors(): string[] {
    return this.SUBMIT_SELECTORS
  }

  /**
   * 获取平台名称
   */
  protected getPlatformName(): string {
    return 'Gemini'
  }

  /**
   * 验证发送按钮是否有效
   */
  protected isValidSendButton(button: Element): boolean {
    // 检查是否被禁用
    if (button.getAttribute('aria-disabled') === 'true') {
      return false
    }
    
    // 检查aria-label
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
    if (ariaLabel.includes('send message') || ariaLabel.includes('发送')) {
      return true
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
    
    return false
  }
}

// 初始化Gemini Content Script
const geminiScript = new GeminiContentScript()
geminiScript.init()