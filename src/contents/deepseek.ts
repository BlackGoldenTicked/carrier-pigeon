import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

export const config: PlasmoContentScript = {
  matches: ['https://chat.deepseek.com/*', 'https://www.deepseek.com/*']
}
class DeepSeekContentScript extends AIPlatformContentScript {

  protected getInputSelectors(): string[] {
    return [
      // DeepSeek 主要的输入框
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="Enter"]',
      'textarea[data-testid*="input"]',
      
      // 通用选择器
      'textarea',
      '[contenteditable="true"]',
      'input[type="text"]'
    ]
  }

  /**
   * 获取发送按钮选择器
   * 精准匹配DeepSeek发送按钮
   */
  protected getSubmitSelectors(): string[] {
    return [
      // DeepSeek 特定按钮类名组合
      'div._17e543b._7436101[role="button"]',
      // 备用：包含SVG的按钮
      'button svg, div[role="button"] svg'
    ]
  }

  /**
   * 获取平台名称
   */
  protected getPlatformName(): string {
    return 'DeepSeek'
  }

  /**
   * 启用详细日志记录
   */
  protected enableDetailedLogging(): boolean {
    return true
  }

  protected isValidSendButton(button: Element): boolean {
    if (button.getAttribute('aria-disabled') === 'true') {
      return false
    }
    
    const classList = button.classList
    if (classList.contains('_17e543b') && classList.contains('_7436101')) {
      return true
    }
    
    return button.querySelector('svg') !== null
  }


}

// 初始化DeepSeek Content Script
const deepseekScript = new DeepSeekContentScript()
deepseekScript.init()