import type { PlasmoContentScript } from "plasmo"
import { OptimizedContentScript } from './optimizedContentScript'

export const config: PlasmoContentScript = {
  matches: [
    'https://kimi.moonshot.cn/*',
    'https://kimi.ai/*',
    'https://kimi.com/*',
    'https://*.kimi.moonshot.cn/*',
    'https://*.kimi.ai/*',
    'https://*.kimi.com/*'
  ]
}

/**
 * Kimi优化的Content Script实现
 */
class KimiContentScript extends OptimizedContentScript {
  private readonly INPUT_SELECTORS = [
    // 新的Lexical编辑器选择器
    '.chat-input-editor[data-lexical-editor="true"]',
    '.chat-input-editor[contenteditable="true"]',
    'div[data-lexical-editor="true"]',
    // Lexical编辑器的段落元素
    '.chat-input-editor p',
    '.chat-input-editor [data-lexical-text="true"]',
    // 容器选择器
    '.chat-input-editor-container',
    '.chat-input[data-v-5207a8dc]',
    // 通用选择器（保持向后兼容）
    'textarea[placeholder*="请输入"]',
    'textarea[placeholder*="输入"]', 
    'div[contenteditable="true"]',
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
    // 基于实际DOM结构的精确选择器
    'div.send-button-container div.send-button',
    'div.send-button-container:not(.disabled) div.send-button',
    'div[data-v-33aac482].send-button-container div[data-v-33aac482].send-button',
    // SVG图标选择器
    'svg.send-icon.iconify[name="Send"]',
    'svg[name="Send"][class*="send-icon"]',
    'div.send-button svg[name="Send"]',
    // 容器选择器
    'div.send-button-container',
    'div.send-button',
    // 通用发送按钮选择器
    'button:has(svg)',
    'button[aria-label*="发送"]',
    'button[title*="发送"]',
    '.send-button',
    '.chat-send-button',
    'button:contains("发送")',
    '.send-btn',
    'button[type="submit"]'
  ]

  protected getInputSelectors(): string[] {
    return this.INPUT_SELECTORS
  }

  protected getSubmitSelectors(): string[] {
    return this.SUBMIT_SELECTORS
  }

  protected isValidSendButton(button: Element): boolean {
    // 检查是否被禁用
    const container = button.closest('.send-button-container')
    if (container && container.classList.contains('disabled')) {
      return false
    }
    
    // 检查是否包含发送图标
    const sendIcon = button.querySelector('svg[name="Send"]')
    if (sendIcon) {
      return true
    }
    
    // 检查特定的类名
    const classList = button.classList
    if (classList.contains('send-button') || classList.contains('chat-send-button') ||
        classList.contains('send-btn')) {
      return true
    }
    
    // 检查aria-label或title
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
    const title = button.getAttribute('title')?.toLowerCase() || ''
    if (ariaLabel.includes('发送') || title.includes('发送')) {
      return true
    }
    
    return false
  }

  /**
   * 初始化Kimi Content Script
   */
  async init(): Promise<void> {
    this.setupMessageListener()
  }

  /**
   * 处理填充文本请求
   */
  private async handleFillText(text: string): Promise<boolean> {
    try {
      const inputElement = await this.findKimiEditor()
      if (!inputElement) {
        return false
      }

      const success = await this.injectTextToKimi(inputElement, text)
      return success
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
   * 查找Kimi编辑器
   */
  private async findKimiEditor(): Promise<HTMLElement | null> {
    // 首先尝试标准选择器
    const element = await this.waitForElement(this.getInputSelectors(), 5000)
    if (element) {
      return element as HTMLElement
    }

    // 尝试在Shadow DOM中查找
    const shadowElement = this.findInShadowDOM(this.getInputSelectors())
    if (shadowElement) {
      return shadowElement
    }

    // 尝试在iframe中查找
    const iframeElement = this.findInIframes(this.getInputSelectors())
    if (iframeElement) {
      return iframeElement
    }

    return null
  }

  /**
   * 在Shadow DOM中查找元素
   */
  private findInShadowDOM(selectors: string[]): HTMLElement | null {
    const elementsWithShadow = document.querySelectorAll('*')
    for (const element of elementsWithShadow) {
      if (element.shadowRoot) {
        for (const selector of selectors) {
          const found = element.shadowRoot.querySelector(selector) as HTMLElement
          if (found && this.isElementVisible(found)) {
            return found
          }
        }
      }
    }
    return null
  }

  /**
   * 在iframe中查找元素
   */
  private findInIframes(selectors: string[]): HTMLElement | null {
    const iframes = document.querySelectorAll('iframe')
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc) {
          for (const selector of selectors) {
            const found = iframeDoc.querySelector(selector) as HTMLElement
            if (found && this.isElementVisible(found)) {
              return found
            }
          }
        }
      } catch (e) {
        // 跨域iframe无法访问
      }
    }
    return null
  }

  /**
   * 向Kimi编辑器注入文本
   */
  private async injectTextToKimi(editor: HTMLElement, text: string): Promise<boolean> {
    // 尝试多种注入方法
    const methods = [
      () => this.tryLexicalDOMInjection(editor, text),
      () => this.tryInputEventInjection(editor, text),
      () => this.tryExecCommandInjection(editor, text),
      () => this.tryKeyboardSimulation(editor, text),
      () => this.tryDirectContentSet(editor, text)
    ]

    for (const method of methods) {
      try {
        const success = await method()
        if (success) {
          return true
        }
      } catch (error) {
        // 注入方法失败，尝试下一个方法
      }
    }

    return false
  }

  /**
   * Lexical DOM注入方法
   */
  private async tryLexicalDOMInjection(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      editor.focus()
      
      // 清空现有内容
      editor.innerHTML = ''
      
      // 创建Lexical段落结构
      const paragraph = document.createElement('p')
      paragraph.setAttribute('data-lexical-text', 'true')
      paragraph.textContent = text
      editor.appendChild(paragraph)
      
      // 触发Lexical事件
      const events = ['input', 'change', 'keydown', 'keyup']
      for (const eventType of events) {
        editor.dispatchEvent(new Event(eventType, { bubbles: true }))
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.editorContainsText(editor, text)
    } catch (error) {
      return false
    }
  }

  /**
   * 输入事件注入方法
   */
  private async tryInputEventInjection(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      editor.focus()
      
      if (editor.tagName === 'TEXTAREA') {
        const textarea = editor as HTMLTextAreaElement
        textarea.value = text
      } else {
        editor.textContent = text
      }
      
      // 触发输入事件
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      })
      editor.dispatchEvent(inputEvent)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.editorContainsText(editor, text)
    } catch (error) {
      return false
    }
  }

  /**
   * execCommand注入方法
   */
  private async tryExecCommandInjection(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      editor.focus()
      
      // 选择所有内容并删除
      document.execCommand('selectAll', false)
      document.execCommand('delete', false)
      
      // 插入新文本
      document.execCommand('insertText', false, text)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.editorContainsText(editor, text)
    } catch (error) {
      return false
    }
  }

  /**
   * 键盘模拟方法
   */
  private async tryKeyboardSimulation(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      editor.focus()
      
      // 清空内容
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      
      // 逐字符输入
      for (const char of text) {
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }))
        editor.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }))
        editor.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }))
        
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: char
        })
        editor.dispatchEvent(inputEvent)
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.editorContainsText(editor, text)
    } catch (error) {
      return false
    }
  }

  /**
   * 直接内容设置方法
   */
  private async tryDirectContentSet(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      editor.focus()
      
      if (editor.tagName === 'TEXTAREA') {
        (editor as HTMLTextAreaElement).value = text
      } else {
        editor.textContent = text
      }
      
      editor.dispatchEvent(new Event('input', { bubbles: true }))
      editor.dispatchEvent(new Event('change', { bubbles: true }))
      
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.editorContainsText(editor, text)
    } catch (error) {
      return false
    }
  }

  /**
   * 检查编辑器是否包含指定文本
   */
  private editorContainsText(editor: HTMLElement, text: string): boolean {
    const content = editor.textContent || editor.innerText || (editor as HTMLInputElement).value || ''
    return content.includes(text)
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
      return false
    }
  }
}

// 初始化Kimi Content Script
const kimiScript = new KimiContentScript()
kimiScript.init()