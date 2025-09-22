/**
 * 通义千问专用内容脚本
 * 独立实现，无外部依赖
 */

import type { PlasmoCSConfig } from 'plasmo'
import { OptimizedContentScript } from './optimizedContentScript'

export const config: PlasmoCSConfig = {
  matches: [
    'https://tongyi.aliyun.com/*',
    'https://qianwen.aliyun.com/*'
  ],
  run_at: 'document_end'
}

/**
 * 通义千问优化的Content Script实现
 */
class TongyiContentScript extends OptimizedContentScript {
  private readonly INPUT_SELECTORS = [
    'textarea',
    'div[contenteditable="true"]',
    'div[role="textbox"]',
    '[placeholder*="问"]',
    '[placeholder*="输入"]',
    '.ant-input',
    'textarea[class*="textarea"]',
    'div[class*="textarea"]'
  ]

  private readonly SUBMIT_SELECTORS = [
    'div.operateBtn--qMhYIdIu',
    'div[class*="operateBtn"]',
    'div[class*="operate"]:has(svg[use*="fasong"])',
    'div[class*="operate"]:has(svg)',
    'div:has(svg use[xlink\\:href*="fasong"])',
    'div:has(svg use[href*="fasong"])',
    'button:has(svg use[xlink\\:href*="fasong"])',
    'button:has(svg use[href*="fasong"])',
    'div[class*="right"] div:has(svg):last-child',
    'div[class*="right"] div[class*="operate"]',
    'div[class*="functionArea"] div[class*="right"] div:has(svg)',
    'button:has(svg):not([aria-label*="新建"]):not([title*="新建"]):not([class*="new"])',
    'div[role="button"]:has(svg):not([aria-label*="新建"]):not([title*="新建"]):not([class*="new"])',
    'form button[type="submit"]',
    '[class*="input"] button:has(svg)',
    '[class*="chat"] button:has(svg)',
    '[class*="message"] button:has(svg)',
    'button[class*="sendBtn"]:not([class*="new"])',
    'button[class*="send-btn"]:not([class*="new"])',
    'div[class*="sendBtn"]:not([class*="new"])',
    'div[class*="send-btn"]:not([class*="new"])',
    'button[aria-label*="发送"]',
    'button[aria-label*="send"]',
    'button[title*="发送"]',
    'button[title*="send"]',
    '[class*="send"]:not([class*="new"])',
    '[class*="submit"]:not([class*="new"])',
    'button[class*="primary"]:has(svg)',
    'div[class*="primary"]:has(svg)',
    'button:has(svg)',
    'div[role="button"]:has(svg)',
    'button[type="submit"]'
  ]

  protected getInputSelectors(): string[] {
    return this.INPUT_SELECTORS
  }

  protected getSubmitSelectors(): string[] {
    return this.SUBMIT_SELECTORS
  }

  protected isValidSendButton(button: Element): boolean {
    const text = button.textContent?.trim().toLowerCase() || ''
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
    const title = button.getAttribute('title')?.toLowerCase() || ''
    const className = button.className.toLowerCase()
    
    // 特殊处理：通义千问的operateBtn按钮（发送按钮）
    if (className.includes('operatebtn') || className.includes('operate-btn')) {
      return true
    }
    
    // 检查SVG图标是否为发送图标
    const svgElement = button.querySelector('svg use')
    if (svgElement) {
      const href = svgElement.getAttribute('xlink:href') || svgElement.getAttribute('href') || ''
      if (href.includes('fasong') || href.includes('send')) {
        return true
      }
    }
    
    // 排除包含这些关键词的按钮
    const excludeKeywords = ['新建', '创建', '添加', '新增', 'new', 'create', 'add', '对话', 'conversation']
    
    for (const keyword of excludeKeywords) {
      if (text.includes(keyword) || ariaLabel.includes(keyword) || title.includes(keyword) || className.includes(keyword)) {
        return false
      }
    }
    
    // 优先选择包含发送相关关键词的按钮
    const sendKeywords = ['发送', 'send', '提交', 'submit', 'fasong']
    const hasSendKeyword = sendKeywords.some(keyword => 
      text.includes(keyword) || ariaLabel.includes(keyword) || title.includes(keyword)
    )
    
    if (hasSendKeyword) {
      return true
    }
    
    // 检查是否包含SVG图标（可能是飞机图标）
    const hasSvg = button.querySelector('svg') !== null
    if (hasSvg) {
      return true
    }
    
    return false
  }

  /**
   * 处理填充文本
   * @param text 要填充的文本
   * @param autoSend 是否自动发送
   */
  private async handleFillText(text: string, autoSend: boolean = false) {
    try {
      const inputElement = await this.waitForElement(this.getInputSelectors(), 5000)
      
      if (!inputElement) {
        return { success: false, error: '未找到输入框' }
      }
      
      await this.injectText(inputElement, text)
      
      if (autoSend) {
        const sendResult = await this.handleAutoSend()
        return {
          success: sendResult.success,
          message: sendResult.success ? '填充并发送成功' : '填充成功但发送失败'
        }
      }
      
      return { success: true, message: '文本填充成功' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 处理自动发送
   */
  private async handleAutoSend() {
    try {
      const submitButton = await this.waitForElementWithFilter(this.getSubmitSelectors(), 5000)
      
      if (!submitButton) {
        return { success: false, error: '未找到发送按钮' }
      }
      
      await this.smartClick(submitButton)
      return { success: true, message: '自动发送成功' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 等待元素出现（带智能过滤）
   */
  private waitForElementWithFilter(selectors: string[], timeout = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      const check = () => {
        for (const selector of selectors) {
          try {
            const elements = document.querySelectorAll(selector)
            for (const element of elements) {
              if (this.isElementVisible(element) && this.isValidSendButton(element)) {
                resolve(element)
                return
              }
            }
          } catch (error) {
            // 忽略选择器错误
          }
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(null)
          return
        }
        
        setTimeout(check, 100)
      }
      
      check()
    })
  }

  /**
   * 检查元素是否可见
   */
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    )
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'autoFillAndSend' && message.text) {
        this.handleFillAndSend(message.text)
          .then(result => {
            sendResponse({ 
              success: result.success, 
              message: result.success ? '填充并发送成功' : '操作失败' 
            })
          })
          .catch(error => {
            sendResponse({ success: false, message: error.message })
          })
        return true
      }
      
      if (message.action === 'fillText') {
        this.handleFillText(message.text, message.autoSend || false)
          .then(result => {
            sendResponse(result)
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message })
          })
        return true
      }
      
      if (message.action === 'autoSend') {
        this.handleAutoSend()
          .then(result => {
            sendResponse(result)
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message })
          })
        return true
      }
      
      if (message.action === 'fillAndSend') {
        this.handleFillAndSend(message.text)
          .then(result => {
            sendResponse(result)
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message })
          })
        return true
      }
    })
  }

  /**
   * 处理填充并发送
   */
  private async handleFillAndSend(text: string) {
    try {
      await this.handleFillText(text, false)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return await this.handleAutoSend()
    } catch (error) {
      throw error
    }
  }

  /**
   * 初始化通义千问content script
   */
  public async init(): Promise<void> {
    this.setupMessageListener()
  }
}

// 创建通义千问实例
const tongyiScript = new TongyiContentScript()

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    tongyiScript.init()
  })
} else {
  tongyiScript.init()
}

// 在页面标题中添加标记，确认脚本运行
if (document.title && !document.title.includes('[MYTAB]')) {
  document.title = '[MYTAB] ' + document.title
}