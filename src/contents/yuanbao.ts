import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

export const config: PlasmoContentScript = {
  matches: [
    'https://yuanbao.tencent.com/*',
    'https://*.yuanbao.tencent.com/*'
  ]
}

/**
 * 元宝AI平台的Content Script实现
 */
class YuanbaoContentScript extends AIPlatformContentScript {
  private readonly INPUT_SELECTORS = [
    // 元宝的输入框选择器
    'div[contenteditable="true"][data-testid="chat-input"]',
    'div[contenteditable="true"][placeholder*="输入"]',
    'div[contenteditable="true"][placeholder*="请输入"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea[placeholder*="输入"]',
    'textarea[placeholder*="请输入"]',
    'textarea[data-testid="chat-input"]',
    // 特定的元宝选择器
    '.yuanbao-input',
    '.tencent-input',
    '.chat-input-area',
    // 通用选择器
    'div[contenteditable="true"]',
    'textarea',
    'input[type="text"]',
    '.input-area textarea',
    '.chat-input textarea',
    '.message-input textarea',
    '#chat-input',
    '.input-box textarea',
    '.chat-textarea',
    '.input-textarea'
  ]

  private readonly SUBMIT_SELECTORS = [
    // 元宝实际的发送按钮选择器（基于真实DOM结构）
    '#yuanbao-send-btn',
    'a#yuanbao-send-btn',
    'a[id="yuanbao-send-btn"]',
    
    // 元宝的类名选择器
    '.style__send-btn___P9SGw',
    'a.style__send-btn___P9SGw',
    'a[class*="style__send-btn"]',
    'a[class*="send-btn"]',
    
    // 元宝图标选择器
    'a:has(.hyc-common-icon.icon-send)',
    'a:has(.icon-send)',
    'a:has(span.icon-send)',
    'a:has(.hyc-common-icon)',
    'a:has(.iconfont.icon-send)',
    
    // 元宝的发送按钮选择器 - 更新的选择器
    'button[data-testid="send-button"]',
    'button[data-testid="chat-send-button"]',
    'button[data-testid="submit-button"]',
    'button[aria-label*="发送"]',
    'button[aria-label*="send"]',
    'button[title*="发送"]',
    'button[title*="send"]',
    // SVG图标选择器
    'button:has(svg[data-icon="send"])',
    'button:has(svg[name="send"])',
    'button:has(svg[class*="send"])',
    'button:has(.send-icon)',
    'button:has(.icon-send)',
    // 腾讯/元宝特定选择器
    '.yuanbao-send-button',
    '.tencent-send-button',
    '.chat-send-btn',
    '.send-message-btn',
    '.submit-message-btn',
    // 通用选择器
    '.send-button',
    '.chat-send-button',
    '.send-btn',
    '.submit-button',
    '.submit-btn',
    'button[type="submit"]',
    // 包含SVG的按钮
    'button:has(svg)',
    'button svg:parent',
    // 文本内容选择器
    'button:contains("发送")',
    'button:contains("Send")',
    'button:contains("提交")',
    // 更宽泛的选择器
    '[role="button"][aria-label*="发送"]',
    '[role="button"]:has(svg)',
    'div[role="button"]:has(svg)',
    // 可能的容器内的按钮
    '.chat-input-container button',
    '.input-container button',
    '.message-input-container button'
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
    return '元宝'
  }

  /**
   * 启用详细日志记录用于调试
   */
  protected enableDetailedLogging(): boolean {
    return true
  }

  /**
   * 验证发送按钮是否有效且可点击
   * @param button - 要验证的按钮元素
   * @returns 是否为有效的发送按钮
   */
  protected isValidSendButton(button: Element): boolean {
    console.log('[元宝] 验证发送按钮:', button);
    
    // 检查是否被禁用
    if (button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') {
      console.log('[元宝] 按钮被禁用');
      return false;
    }

    // 特殊检查：元宝的实际发送按钮
    const buttonId = button.getAttribute('id');
    if (buttonId === 'yuanbao-send-btn') {
      console.log('[元宝] 通过 ID 验证: yuanbao-send-btn');
      return true;
    }

    // 检查元宝特定的类名
    const className = button.className;
    if (className.includes('style__send-btn') || className.includes('send-btn')) {
      console.log('[元宝] 通过元宝特定类名验证:', className);
      return true;
    }

    // 检查元宝的图标
    const iconElement = button.querySelector('.hyc-common-icon.icon-send, .icon-send, .iconfont.icon-send');
    if (iconElement) {
      console.log('[元宝] 通过元宝图标验证');
      return true;
    }

    // 检查 data-testid
    const testId = button.getAttribute('data-testid');
    if (testId && (testId.includes('send') || testId.includes('submit'))) {
      console.log('[元宝] 通过 data-testid 验证:', testId);
      return true;
    }

    // 检查是否包含发送图标（SVG）
    const svgIcon = button.querySelector('svg[class*="send"], svg[class*="arrow"], svg[class*="submit"]');
    if (svgIcon) {
      console.log('[元宝] 通过 SVG 图标验证');
      return true;
    }

    // 检查类名
    const sendClassNames = ['send', 'submit', 'primary', 'action', 'btn-send', 'btn-submit'];
    if (sendClassNames.some(cls => className.includes(cls))) {
      console.log('[元宝] 通过类名验证:', className);
      return true;
    }

    // 检查 aria-label
    const ariaLabel = button.getAttribute('aria-label');
    if (ariaLabel && (ariaLabel.includes('发送') || ariaLabel.includes('Send') || ariaLabel.includes('Submit') || ariaLabel.includes('提交'))) {
      console.log('[元宝] 通过 aria-label 验证:', ariaLabel);
      return true;
    }

    // 检查 title
    const title = button.getAttribute('title');
    if (title && (title.includes('发送') || title.includes('Send') || title.includes('Submit') || title.includes('提交'))) {
      console.log('[元宝] 通过 title 验证:', title);
      return true;
    }

    // 检查文本内容
    const textContent = button.textContent?.trim().toLowerCase();
    if (textContent && (textContent.includes('发送') || textContent.includes('send') || textContent.includes('submit') || textContent.includes('提交'))) {
      console.log('[元宝] 通过文本内容验证:', textContent);
      return true;
    }

    // 更宽松的 SVG 特征检查
    const hasAnySvg = button.querySelector('svg');
    if (hasAnySvg && (button.tagName.toLowerCase() === 'button' || button.tagName.toLowerCase() === 'a')) {
      console.log('[元宝] 通过宽松 SVG 检查');
      return true;
    }

    // 特殊处理：如果是 a 标签且包含图标类
    if (button.tagName.toLowerCase() === 'a' && button.querySelector('.icon-send, .hyc-common-icon')) {
      console.log('[元宝] 通过 a 标签图标检查');
      return true;
    }

    console.log('[元宝] 按钮验证失败');
    return false;
  }
}

// 初始化元宝 Content Script
const yuanbaoScript = new YuanbaoContentScript()
yuanbaoScript.init()