import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

export const config: PlasmoContentScript = {
  matches: [
    'https://*.tongyi.com/*',
  ]
}

/**
 * 通义千问AI平台的Content Script实现
 */
class TongyiContentScript extends AIPlatformContentScript {

  /**
   * 获取输入框选择器
   */
  protected getInputSelectors(): string[] {
    return [
      // 通义千问主要输入框
      'div[contenteditable="true"][data-testid="chat-input"]',
      'div[contenteditable="true"][role="textbox"]',
      // 通用选择器
      'div[contenteditable="true"]',
      'textarea'
    ]
  }

  /**
   * 获取发送按钮选择器
   * 精准匹配通义千问发送按钮
   */
  protected getSubmitSelectors(): string[] {
    return [
      // 通义千问特定按钮类名
      'div.operateBtn--qMhYIdIu',
      // 备用：包含SVG的按钮
      'div svg, button svg'
    ]
  }

  /**
   * 获取平台名称
   */
  protected getPlatformName(): string {
    return '通义千问'
  }

  /**
   * 启用详细日志记录
   */
  protected enableDetailedLogging(): boolean {
    return true
  }

  /**
   * 验证发送按钮是否有效
   * 精准检测通义千问发送按钮
   */
  protected isValidSendButton(button: Element): boolean {
    // 检查是否被禁用
    if (button.hasAttribute('disabled') || button.classList.contains('disabled')) {
      return false
    }
    
    // 检查通义千问特定的类名
    if (button.classList.contains('operateBtn--qMhYIdIu')) {
      return true
    }
    
    // 检查是否包含SVG图标（备用检测）
    return button.querySelector('svg') !== null
  }
}

// 初始化通义千问 Content Script
const tongyiScript = new TongyiContentScript()
tongyiScript.init()