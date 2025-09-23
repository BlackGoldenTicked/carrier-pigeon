import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

export const config: PlasmoContentScript = {
  matches: [
    'https://*.doubao.com/*'
  ]
}

/**
 * 豆包AI平台的Content Script实现
 * 简洁版本，参考通义千问的实现模式
 */
class DoubaoContentScript extends AIPlatformContentScript {

  /**
   * 获取输入框选择器
   * 基于豆包真实DOM结构的精准选择器
   */
  protected getInputSelectors(): string[] {
    return [
      // 豆包主要输入框
      'textarea[data-testid="chat_input_input"]',
      'textarea.semi-input-textarea-autosize',
      'textarea[placeholder="输入问题或任务"]',
      // 通用备用选择器
      'div[contenteditable="true"]',
      'textarea'
    ]
  }

  /**
   * 获取发送按钮选择器
   * 精准匹配豆包发送按钮
   */
  protected getSubmitSelectors(): string[] {
    return [
      // 豆包特定按钮
      'button[data-testid="chat_input_send_button"]',
      'button#flow-end-msg-send',
      'button.send-btn-gNkciw',
      // 备用：包含SVG的按钮
      'button:has(svg)',
      'button.semi-button-primary'
    ]
  }

  /**
   * 获取平台名称
   */
  protected getPlatformName(): string {
    return '豆包'
  }

  /**
   * 启用详细日志记录
   */
  protected enableDetailedLogging(): boolean {
    return false
  }

  /**
   * 验证发送按钮是否有效
   * 精准检测豆包发送按钮的可用状态
   */
  protected isValidSendButton(button: Element): boolean {
    // 检查是否被禁用
    if (button.hasAttribute('disabled') ||
      button.getAttribute('aria-disabled') === 'true' ||
      button.classList.contains('semi-button-disabled')) {
      return false
    }
    
    // 检查豆包特定的按钮标识
    if (button.getAttribute('data-testid') === 'chat_input_send_button' ||
      button.id === 'flow-end-msg-send' ||
      button.classList.contains('send-btn-gNkciw')) {
      return true
    }
    
    // 检查是否包含SVG图标
    return button.querySelector('svg') !== null
  }
}


const doubaoScript = new DoubaoContentScript()
doubaoScript.init()