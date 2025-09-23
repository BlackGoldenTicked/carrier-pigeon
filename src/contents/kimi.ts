import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

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
 * Kimi AI平台的Content Script实现
 */
class KimiContentScript extends AIPlatformContentScript {
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
    // 新版发送按钮选择器
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
    // 通用选择器
    'button:has(svg)',
    'button[aria-label*="发送"]',
    'button[title*="发送"]',
    '.send-button',
    '.chat-send-button',
    'button:contains("发送")',
    '.send-btn',
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
    return 'Kimi'
  }

  /**
   * 验证发送按钮是否有效
   */
  protected isValidSendButton(button: Element): boolean {
    // 检查是否被禁用
    if (button.classList.contains('disabled')) {
      return false
    }
    
    // 检查是否包含发送图标
    const sendIcon = button.querySelector('svg[name="Send"]') || 
                     button.querySelector('svg.send-icon')
    if (sendIcon) {
      return true
    }
    
    // 检查特定的类名
    const classList = button.classList
    if (classList.contains('send-button') || classList.contains('send-btn') ||
        classList.contains('chat-send-button')) {
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
   * 重写文本注入方法以支持Kimi的特殊编辑器
   */
  protected async injectText(element: Element, text: string, triggerEvents: boolean = true): Promise<void> {
    // 首先尝试找到Kimi的特殊编辑器
    const kimiEditor = await this.findKimiEditor()
    if (kimiEditor) {
      await this.injectTextToKimi(kimiEditor, text)
      return
    }
    
    // 如果没有找到特殊编辑器，使用基类的默认方法
    await super.injectText(element, text, triggerEvents)
  }

  /**
   * 查找Kimi编辑器
   */
  private async findKimiEditor(): Promise<HTMLElement | null> {
    // 尝试在主文档中查找
    for (const selector of this.INPUT_SELECTORS) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        return element
      }
    }

    // 尝试在Shadow DOM中查找
    const shadowElement = this.findInShadowDOM(this.INPUT_SELECTORS)
    if (shadowElement) {
      return shadowElement
    }

    // 尝试在iframe中查找
    const iframeElement = this.findInIframes(this.INPUT_SELECTORS)
    if (iframeElement) {
      return iframeElement
    }

    return null
  }

  /**
   * 在Shadow DOM中查找元素
   */
  private findInShadowDOM(selectors: string[]): HTMLElement | null {
    const allElements = document.querySelectorAll('*')
    for (const element of allElements) {
      if (element.shadowRoot) {
        for (const selector of selectors) {
          const found = element.shadowRoot.querySelector(selector) as HTMLElement
          if (found) {
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
            const element = iframeDoc.querySelector(selector) as HTMLElement
            if (element) {
              return element
            }
          }
        }
      } catch (error) {
        // 跨域iframe无法访问，忽略错误
      }
    }
    return null
  }

  /**
   * 向Kimi编辑器注入文本
   */
  private async injectTextToKimi(editor: HTMLElement, text: string): Promise<boolean> {
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
        if (success && this.editorContainsText(editor, text)) {
          return true
        }
      } catch (error) {
        console.warn(`[Kimi] 注入方法失败:`, error)
      }
    }

    return false
  }

  /**
   * 尝试Lexical DOM注入
   */
  private async tryLexicalDOMInjection(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      // 清空现有内容
      editor.innerHTML = ''
      
      // 创建段落元素
      const paragraph = document.createElement('p')
      paragraph.setAttribute('data-lexical-text', 'true')
      paragraph.textContent = text
      
      editor.appendChild(paragraph)
      
      // 触发输入事件
      const inputEvent = new Event('input', { bubbles: true })
      editor.dispatchEvent(inputEvent)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 尝试输入事件注入
   */
  private async tryInputEventInjection(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      editor.focus()
      
      // 清空内容
      editor.innerHTML = ''
      
      // 设置文本内容
      editor.textContent = text
      
      // 触发一系列事件
      const events = ['focus', 'input', 'change', 'blur']
      for (const eventType of events) {
        const event = new Event(eventType, { bubbles: true })
        editor.dispatchEvent(event)
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 尝试execCommand注入
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
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 尝试键盘模拟
   */
  private async tryKeyboardSimulation(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      editor.focus()
      
      // 清空内容
      const selectAllEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true
      })
      editor.dispatchEvent(selectAllEvent)
      
      const deleteEvent = new KeyboardEvent('keydown', {
        key: 'Delete',
        bubbles: true
      })
      editor.dispatchEvent(deleteEvent)
      
      // 逐字符输入
      for (const char of text) {
        const keydownEvent = new KeyboardEvent('keydown', {
          key: char,
          bubbles: true
        })
        const keypressEvent = new KeyboardEvent('keypress', {
          key: char,
          bubbles: true
        })
        const inputEvent = new InputEvent('input', {
          data: char,
          bubbles: true
        })
        
        editor.dispatchEvent(keydownEvent)
        editor.dispatchEvent(keypressEvent)
        editor.dispatchEvent(inputEvent)
        
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 尝试直接设置内容
   */
  private async tryDirectContentSet(editor: HTMLElement, text: string): Promise<boolean> {
    try {
      // 尝试多种属性设置
      const properties = ['value', 'textContent', 'innerText', 'innerHTML']
      
      for (const prop of properties) {
        try {
          if (prop === 'innerHTML') {
            (editor as any)[prop] = `<p>${text}</p>`
          } else {
            (editor as any)[prop] = text
          }
          
          // 触发事件
          const event = new Event('input', { bubbles: true })
          editor.dispatchEvent(event)
          
          await new Promise(resolve => setTimeout(resolve, 50))
          
          if (this.editorContainsText(editor, text)) {
            return true
          }
        } catch (error) {
          continue
        }
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * 检查编辑器是否包含指定文本
   */
  private editorContainsText(editor: HTMLElement, text: string): boolean {
    const content = editor.textContent || editor.innerText || (editor as any).value || ''
    return content.includes(text)
  }
}

// 初始化Kimi Content Script
const kimiScript = new KimiContentScript()
kimiScript.init()