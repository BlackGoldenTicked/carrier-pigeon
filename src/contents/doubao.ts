import type { PlasmoContentScript } from "plasmo"
import { AIPlatformContentScript } from './aiPlatformContentScript'

export const config: PlasmoContentScript = {
  matches: [
    'https://*.doubao.com/*',
  ]
}

/**
 * 豆包AI平台的Content Script实现
 */
class DoubaoContentScript extends AIPlatformContentScript {

  /**
   * 获取输入框选择器
   * 精准匹配豆包输入框 - 基于真实DOM结构
   */
  protected getInputSelectors(): string[] {
    return [
      // 豆包最精确的选择器 - 基于真实DOM结构
      'textarea[data-testid="chat_input_input"].semi-input-textarea.semi-input-textarea-autosize',
      'textarea[data-testid="chat_input_input"]',
      
      // 豆包类名组合选择器
      'textarea.semi-input-textarea.semi-input-textarea-autosize[placeholder="输入问题或任务"]',
      'textarea.semi-input-textarea.semi-input-textarea-autosize',
      
      // 豆包特定属性选择器
      'textarea[placeholder="输入问题或任务"]',
      'textarea[autocomplete="off"][rows="1"]',
      
      // 豆包容器选择器
      '.semi-input-textarea-wrapper textarea',
      '.container-Yy6Qj7 textarea',
      
      // 备用选择器
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="问题"]',
      'textarea[placeholder*="任务"]',
      'textarea[data-testid*="chat"]',
      'textarea[data-testid*="input"]',
      
      // 通用选择器（最后备用）
      'textarea'
    ]
  }

  /**
   * 获取发送按钮选择器 - 基于豆包真实DOM结构
   * 精准匹配豆包发送按钮
   */
  protected getSubmitSelectors(): string[] {
    return [
      // 豆包特定选择器
      'button[data-testid="chat_input_send_button"]',
      'button#flow-end-msg-send',
      'button.send-btn-gNkciw',
      'button.semi-button:has(svg)',
      
      // 容器选择器
      '.send-btn-wrapper button',
      '.container-LQV0KD button',
      
      // 通用选择器作为备用
      'button[aria-label*="发送"]',
      'button[aria-label*="send"]',
      'button:has(svg[viewBox="0 0 24 24"])',
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
    return true
  }

  /**
   * 验证发送按钮是否有效 - 基于豆包真实DOM结构
   * 精准检测豆包发送按钮的可用状态
   */
  protected isValidSendButton(button: Element): boolean {
    // 豆包特定的禁用状态检查
    if (button.hasAttribute('disabled') || 
        button.getAttribute('aria-disabled') === 'true' ||
        button.classList.contains('semi-button-disabled') ||
        button.classList.contains('semi-button-primary-disabled')) {
      return false
    }
    
    // 检查豆包特定的按钮标识
    if (button.getAttribute('data-testid') === 'chat_input_send_button' ||
        button.id === 'flow-end-msg-send') {
      return true
    }
    
    // 检查豆包按钮类名
    if (button.classList.contains('send-btn-gNkciw') ||
        button.classList.contains('semi-button-primary')) {
      return true
    }
    
    // 检查是否包含发送图标的SVG
    const svg = button.querySelector('svg')
    if (svg && svg.getAttribute('viewBox') === '0 0 24 24') {
      return true
    }
    
    // 检查aria-label
    const ariaLabel = button.getAttribute('aria-label')
    if (ariaLabel && ariaLabel.includes('发送')) {
      return true
    }
    
    return false
  }

  /**
   * 重写文本注入方法以支持豆包的textarea编辑器
   * 专门针对豆包的semi-input-textarea结构优化
   */
  protected async injectText(element: Element, text: string, triggerEvents = true): Promise<void> {
    if (!element) return

    try {
      const inputElement = element as HTMLElement
      
      // 聚焦输入框
      inputElement.focus()
      
      // 豆包主要使用textarea，专门处理
      if (inputElement.tagName.toLowerCase() === 'textarea') {
        await this.handleDoubaoTextarea(inputElement as HTMLTextAreaElement, text)
      } else if (inputElement.contentEditable === 'true') {
        // 处理contenteditable div（备用）
        this.handleContentEditableInput(inputElement, text)
      } else {
        // 其他类型的输入元素
        const input = inputElement as HTMLInputElement
        if ('value' in input) {
          input.value = text
        } else {
          inputElement.textContent = text
        }
      }
      
      if (triggerEvents) {
        // 触发豆包编辑器的事件
        this.triggerDoubaoEvents(inputElement)
      }
      
      // 确保输入框获得焦点
      inputElement.focus()
      
      // 记录注入结果
      const isEmptyContent = text.trim() === ''
      console.log(`[豆包] 文本注入成功${isEmptyContent ? ' (空白内容)' : ''}: "${text}"`)
    } catch (error) {
      console.error('[豆包] 文本注入失败:', error)
      // 回退到基类方法
      await super.injectText(element, text, triggerEvents)
    }
  }

  /**
   * 专门处理豆包的textarea输入框
   * 针对semi-input-textarea-autosize的特殊处理，使用多种注入策略
   */
  private async handleDoubaoTextarea(textarea: HTMLTextAreaElement, text: string): Promise<void> {
    // 策略1: 模拟用户输入行为
    const success1 = await this.tryUserSimulationInjection(textarea, text)
    if (success1) return

    // 策略2: React/Vue组件兼容注入
    const success2 = await this.tryReactVueInjection(textarea, text)
    if (success2) return

    // 策略3: 强制DOM注入
    await this.tryForceDOMInjection(textarea, text)
  }

  /**
   * 策略1: 模拟真实用户输入行为
   */
  private async tryUserSimulationInjection(textarea: HTMLTextAreaElement, text: string): Promise<boolean> {
    try {
      console.log(`[豆包] 开始用户模拟注入: "${text}"`)
      console.log(`[豆包] 目标元素:`, textarea)
      console.log(`[豆包] 当前值: "${textarea.value}"`)
      
      // 确保元素可见和可交互
      if (!this.isElementInteractable(textarea)) {
        console.warn('[豆包] 元素不可交互')
        return false
      }
      
      // 聚焦并选中所有内容
      textarea.focus()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // 选中所有现有内容
      textarea.setSelectionRange(0, textarea.value.length)
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // 模拟键盘删除现有内容
      textarea.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Backspace', 
        bubbles: true,
        cancelable: true
      }))
      
      // 清空现有内容
      textarea.value = ''
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // 触发清空事件
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // 使用execCommand插入文本（如果支持）
      if (document.execCommand && !document.execCommand.toString().includes('[native code]')) {
        console.log('[豆包] 尝试execCommand注入')
        const success = document.execCommand('insertText', false, text)
        if (success) {
          console.log('[豆包] execCommand注入成功')
          await new Promise(resolve => setTimeout(resolve, 100))
          await this.triggerCompleteEventSequence(textarea)
          return this.verifyTextInjection(textarea, text)
        }
      }
      
      // 回退到直接设置
      console.log('[豆包] 使用直接设置方式')
      textarea.value = text
      
      // 触发完整的事件序列
      await this.triggerCompleteEventSequence(textarea)
      
      return this.verifyTextInjection(textarea, text)
    } catch (error) {
      console.warn('[豆包] 用户模拟注入失败:', error)
      return false
    }
  }

  /**
   * 检查元素是否可交互
   */
  private isElementInteractable(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      !element.hasAttribute('disabled') &&
      !element.hasAttribute('readonly')
    )
  }

  /**
   * 策略2: React/Vue组件兼容注入
   */
  private async tryReactVueInjection(textarea: HTMLTextAreaElement, text: string): Promise<boolean> {
    try {
      console.log('[豆包] 开始React/Vue组件注入')
      
      // 查找React实例
      const reactKey = Object.keys(textarea).find(key => 
        key.startsWith('__reactInternalInstance') || 
        key.startsWith('__reactFiber') ||
        key.startsWith('__reactProps')
      )
      
      if (reactKey) {
        console.log('[豆包] 发现React实例')
        const reactInstance = (textarea as any)[reactKey]
        
        // 尝试多种React组件更新方式
        if (reactInstance) {
          // 方式1: 通过memoizedProps
          if (reactInstance.memoizedProps) {
            if (reactInstance.memoizedProps.onChange) {
              console.log('[豆包] 触发React onChange')
              reactInstance.memoizedProps.onChange({
                target: { value: text },
                currentTarget: textarea,
                type: 'change'
              })
            }
            if (reactInstance.memoizedProps.onInput) {
              console.log('[豆包] 触发React onInput')
              reactInstance.memoizedProps.onInput({
                target: { value: text },
                currentTarget: textarea,
                type: 'input'
              })
            }
          }
          
          // 方式2: 通过pendingProps
          if (reactInstance.pendingProps) {
            if (reactInstance.pendingProps.onChange) {
              reactInstance.pendingProps.onChange({
                target: { value: text },
                currentTarget: textarea,
                type: 'change'
              })
            }
          }
          
          // 方式3: 通过stateNode
          if (reactInstance.stateNode && reactInstance.stateNode.props) {
            const props = reactInstance.stateNode.props
            if (props.onChange) {
              props.onChange({
                target: { value: text },
                currentTarget: textarea,
                type: 'change'
              })
            }
          }
        }
      }
      
      // 查找Vue实例
      const vueInstance = (textarea as any).__vue__ || (textarea as any)._vnode
      if (vueInstance) {
        console.log('[豆包] 发现Vue实例')
        // 触发Vue的input事件
        if (vueInstance.componentInstance && vueInstance.componentInstance.$emit) {
          vueInstance.componentInstance.$emit('input', text)
          vueInstance.componentInstance.$emit('change', text)
        }
      }
      
      // 特殊处理：Semi Design组件
      if (textarea.classList.contains('semi-input-textarea')) {
        console.log('[豆包] 检测到Semi Design组件')
        
        // 查找Semi组件实例
        const semiInstance = (textarea as any).__semi__ || 
                            (textarea.parentElement as any)?.__semi__
        
        if (semiInstance) {
          console.log('[豆包] 发现Semi组件实例')
          // 尝试调用Semi组件的更新方法
          if (typeof semiInstance.setValue === 'function') {
            semiInstance.setValue(text)
          }
          if (typeof semiInstance.handleChange === 'function') {
            semiInstance.handleChange({ target: { value: text } })
          }
        }
      }
      
      // 设置值并触发事件
      textarea.value = text
      
      // 触发特殊的Semi组件事件
      textarea.dispatchEvent(new CustomEvent('semi-change', {
        detail: { value: text },
        bubbles: true
      }))
      
      await this.triggerCompleteEventSequence(textarea)
      
      return this.verifyTextInjection(textarea, text)
    } catch (error) {
      console.warn('[豆包] React/Vue注入失败:', error)
      return false
    }
  }

  /**
   * 策略3: 强制DOM注入
   */
  private async tryForceDOMInjection(textarea: HTMLTextAreaElement, text: string): Promise<void> {
    // 强制设置值
    textarea.value = text
    
    // 设置属性
    textarea.setAttribute('value', text)
    
    // 触发所有可能的事件
    await this.triggerCompleteEventSequence(textarea)
    
    // 强制更新高度
    if (textarea.classList.contains('semi-input-textarea-autosize')) {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
    
    // 最后确保聚焦
    textarea.focus()
  }

  /**
   * 触发完整的事件序列
   */
  private async triggerCompleteEventSequence(textarea: HTMLTextAreaElement): Promise<void> {
    console.log('[豆包] 开始触发完整事件序列')
    
    // 阶段1: 聚焦事件
    const focusEvents = [
      { type: 'focus', delay: 50 },
      { type: 'focusin', delay: 30 }
    ]
    
    for (const { type, delay } of focusEvents) {
      textarea.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // 阶段2: 键盘事件（模拟用户输入）
    const keyboardEvents = [
      { type: 'keydown', key: 'a', ctrlKey: true, delay: 30 },
      { type: 'keyup', key: 'a', ctrlKey: true, delay: 30 },
      { type: 'keydown', key: 'Backspace', delay: 30 },
      { type: 'keyup', key: 'Backspace', delay: 30 }
    ]
    
    for (const { type, key, ctrlKey, delay } of keyboardEvents) {
      textarea.dispatchEvent(new KeyboardEvent(type, { 
        key: key || '', 
        ctrlKey: ctrlKey || false, 
        bubbles: true, 
        cancelable: true 
      }))
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // 阶段3: 输入事件
    const inputEvents = [
      { type: 'beforeinput', delay: 50 },
      { type: 'input', delay: 100 },
      { type: 'textInput', delay: 50 },
      { type: 'change', delay: 100 }
    ]
    
    for (const { type, delay } of inputEvents) {
      if (type === 'beforeinput') {
        textarea.dispatchEvent(new InputEvent(type, {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: textarea.value
        }))
      } else if (type === 'input') {
        textarea.dispatchEvent(new InputEvent(type, {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText'
        }))
      } else {
        textarea.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // 阶段4: 豆包特有事件
    const doubaoEvents = [
      { name: 'doubao-update', detail: { source: 'extension', timestamp: Date.now() }, delay: 30 },
      { name: 'doubao-text-change', detail: { source: 'extension', timestamp: Date.now() }, delay: 30 },
      { name: 'semi-change', detail: { value: textarea.value }, delay: 30 },
      { name: 'semi-input-change', detail: { value: textarea.value }, delay: 30 }
    ]
    
    for (const { name, detail, delay } of doubaoEvents) {
      textarea.dispatchEvent(new CustomEvent(name, { 
        detail: detail, 
        bubbles: true 
      }))
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // 阶段5: 通用自定义事件
    const customEvents = [
      { name: 'text-updated', delay: 20 },
      { name: 'content-changed', delay: 20 },
      { name: 'value-changed', delay: 20 }
    ]
    
    for (const { name, delay } of customEvents) {
      textarea.dispatchEvent(new CustomEvent(name, { 
        detail: { source: 'extension' }, 
        bubbles: true 
      }))
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // 阶段6: 失焦事件（延迟触发）
    await new Promise(resolve => setTimeout(resolve, 100))
    const blurEvents = [
      { type: 'blur', delay: 50 },
      { type: 'focusout', delay: 30 },
      { type: 'focus', delay: 50 } // 重新聚焦
    ]
    
    for (const { type, delay } of blurEvents) {
      textarea.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    console.log('[豆包] 事件序列触发完成')
  }

  /**
   * 验证文本注入是否成功
   */
  private verifyTextInjection(textarea: HTMLTextAreaElement, expectedText: string): boolean {
    const actualText = textarea.value
    const success = actualText === expectedText
    
    if (success) {
      console.log(`[豆包] 文本注入验证成功: "${expectedText}"`)
    } else {
      console.warn(`[豆包] 文本注入验证失败. 期望: "${expectedText}", 实际: "${actualText}"`)
      
      // 详细调试信息
      this.debugDoubaoElement(textarea, expectedText)
    }
    
    return success
  }

  /**
   * 豆包元素调试方法
   */
  private debugDoubaoElement(textarea: HTMLTextAreaElement, expectedText: string): void {
    console.group('[豆包] 元素调试信息')
    
    // 基本信息
    console.log('元素标签:', textarea.tagName)
    console.log('元素类名:', textarea.className)
    console.log('元素ID:', textarea.id)
    console.log('data-testid:', textarea.getAttribute('data-testid'))
    console.log('当前值:', `"${textarea.value}"`)
    console.log('期望值:', `"${expectedText}"`)
    console.log('值长度:', textarea.value.length, '期望长度:', expectedText.length)
    
    // 元素状态
    console.log('是否聚焦:', document.activeElement === textarea)
    console.log('是否禁用:', textarea.disabled)
    console.log('是否只读:', textarea.readOnly)
    console.log('是否可见:', textarea.offsetParent !== null)
    
    // 样式信息
    const style = window.getComputedStyle(textarea)
    console.log('display:', style.display)
    console.log('visibility:', style.visibility)
    console.log('opacity:', style.opacity)
    
    // React/Vue实例检查
    const reactKeys = Object.keys(textarea).filter(key => 
      key.startsWith('__react') || key.startsWith('_react')
    )
    console.log('React实例键:', reactKeys)
    
    const vueKeys = Object.keys(textarea).filter(key => 
      key.includes('vue') || key.includes('Vue')
    )
    console.log('Vue实例键:', vueKeys)
    
    // Semi Design检查
    const semiKeys = Object.keys(textarea).filter(key => 
      key.includes('semi') || key.includes('Semi')
    )
    console.log('Semi实例键:', semiKeys)
    
    // 父元素信息
    if (textarea.parentElement) {
      console.log('父元素标签:', textarea.parentElement.tagName)
      console.log('父元素类名:', textarea.parentElement.className)
      
      const parentSemiKeys = Object.keys(textarea.parentElement).filter(key => 
        key.includes('semi') || key.includes('Semi')
      )
      console.log('父元素Semi实例键:', parentSemiKeys)
    }
    
    // 事件监听器检查
    console.log('事件监听器数量:', this.getEventListenerCount(textarea))
    
    console.groupEnd()
  }

  /**
   * 获取元素的事件监听器数量（近似）
   */
  private getEventListenerCount(element: HTMLElement): number {
    let count = 0
    const events = ['input', 'change', 'focus', 'blur', 'keydown', 'keyup', 'click']
    
    events.forEach(eventType => {
      // 检查是否有对应的属性
      if ((element as any)[`on${eventType}`]) {
        count++
      }
    })
    
    return count
  }

  /**
   * 处理contenteditable输入框
   * 豆包可能使用contenteditable div作为输入框，使用多种注入策略
   */
  private async handleContentEditableInput(element: HTMLElement, text: string): Promise<void> {
    // 策略1: 模拟用户输入
    const success1 = await this.tryContentEditableUserSimulation(element, text)
    if (success1) return

    // 策略2: 富文本编辑器兼容注入
    const success2 = await this.tryRichEditorInjection(element, text)
    if (success2) return

    // 策略3: 强制DOM注入
    await this.tryContentEditableForceDOMInjection(element, text)
  }

  /**
   * ContentEditable策略1: 模拟用户输入
   */
  private async tryContentEditableUserSimulation(element: HTMLElement, text: string): Promise<boolean> {
    try {
      // 聚焦元素
      element.focus()
      
      // 选中所有内容
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(element)
      selection?.removeAllRanges()
      selection?.addRange(range)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 使用execCommand插入文本
      if (document.execCommand) {
        const success = document.execCommand('insertText', false, text)
        if (success) {
          await new Promise(resolve => setTimeout(resolve, 100))
          return this.verifyContentEditableInjection(element, text)
        }
      }
      
      // 回退到直接设置
      element.textContent = text
      await this.triggerDoubaoEvents(element)
      
      return this.verifyContentEditableInjection(element, text)
    } catch (error) {
      console.warn('[豆包] ContentEditable用户模拟注入失败:', error)
      return false
    }
  }

  /**
   * ContentEditable策略2: 富文本编辑器兼容注入
   */
  private async tryRichEditorInjection(element: HTMLElement, text: string): Promise<boolean> {
    try {
      // 清空内容
      element.innerHTML = ''
      
      // 创建文本节点
      const textNode = document.createTextNode(text)
      element.appendChild(textNode)
      
      // 设置光标到末尾
      const selection = window.getSelection()
      const range = document.createRange()
      range.setStartAfter(textNode)
      range.setEndAfter(textNode)
      selection?.removeAllRanges()
      selection?.addRange(range)
      
      // 触发事件
      await this.triggerDoubaoEvents(element)
      
      return this.verifyContentEditableInjection(element, text)
    } catch (error) {
      console.warn('[豆包] 富文本编辑器注入失败:', error)
      return false
    }
  }

  /**
   * ContentEditable策略3: 强制DOM注入
   */
  private async tryContentEditableForceDOMInjection(element: HTMLElement, text: string): Promise<void> {
    // 多种方式设置内容
    element.innerHTML = ''
    element.textContent = text
    element.innerText = text
    
    // 如果内容为空，设置placeholder状态
    if (!text.trim()) {
      element.innerHTML = '<br>'
    }
    
    // 强制触发所有事件
    await this.triggerDoubaoEvents(element)
    
    // 确保聚焦
    element.focus()
  }

  /**
   * 验证ContentEditable文本注入是否成功
   */
  private verifyContentEditableInjection(element: HTMLElement, expectedText: string): boolean {
    const actualText = element.textContent || element.innerText || ''
    const success = actualText.trim() === expectedText.trim()
    
    if (success) {
      console.log(`[豆包] ContentEditable注入验证成功: "${expectedText}"`)
    } else {
      console.warn(`[豆包] ContentEditable注入验证失败. 期望: "${expectedText}", 实际: "${actualText}"`)
    }
    
    return success
  }

  /**
   * 触发豆包编辑器的特定事件
   * 确保豆包能够正确识别文本变化，使用全面的事件触发策略
   */
  private async triggerDoubaoEvents(element: HTMLElement): Promise<void> {
    // 基础事件序列
    const basicEvents = [
      { type: 'focus', delay: 50 },
      { type: 'focusin', delay: 30 },
      { type: 'keydown', delay: 50, keyCode: 65, ctrlKey: true }, // Ctrl+A
      { type: 'keyup', delay: 30, keyCode: 65, ctrlKey: true },
      { type: 'beforeinput', delay: 50 },
      { type: 'input', delay: 100 },
      { type: 'keydown', delay: 50, keyCode: 13 }, // Enter key simulation
      { type: 'keyup', delay: 30, keyCode: 13 },
      { type: 'change', delay: 100 },
      { type: 'blur', delay: 50 },
      { type: 'focusout', delay: 30 },
      { type: 'focus', delay: 50 } // 重新聚焦
    ]
    
    // 触发基础事件序列
    for (const { type, delay, keyCode, ctrlKey } of basicEvents) {
      let event: Event
      
      if (type.startsWith('key')) {
        event = new KeyboardEvent(type, { 
          bubbles: true, 
          cancelable: true,
          keyCode: keyCode || 0,
          which: keyCode || 0,
          ctrlKey: ctrlKey || false
        })
      } else if (type === 'beforeinput') {
        event = new InputEvent(type, {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: element.textContent || ''
        })
      } else if (type === 'input') {
        event = new InputEvent(type, {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText'
        })
      } else {
        event = new Event(type, { bubbles: true, cancelable: true })
      }
      
      element.dispatchEvent(event)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // 触发自定义事件（豆包可能监听的特殊事件）
    const customEvents = [
      'doubao-update',
      'doubao-text-change',
      'semi-input-change',
      'textarea-change',
      'content-update'
    ]
    
    for (const eventName of customEvents) {
      element.dispatchEvent(new CustomEvent(eventName, { 
        bubbles: true, 
        detail: { 
           source: 'extension',
           text: element.textContent || (element as any).value || '',
           timestamp: Date.now()
         } 
      }))
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    // 触发可能的框架特定事件
    await this.triggerFrameworkEvents(element)
    
    // 获取内容信息用于日志
    let isEmpty = false
    let content = ''
    
    if (element.tagName === 'DIV' && element.contentEditable === 'true') {
      // contenteditable div
      content = element.textContent || ''
      isEmpty = content.trim() === '' || element.innerHTML === '<br>'
    } else if (element.tagName === 'TEXTAREA') {
      // textarea
      const textarea = element as HTMLTextAreaElement
      content = textarea.value || ''
      isEmpty = content.trim() === ''
    } else if (element.tagName === 'INPUT') {
      // input
      const input = element as HTMLInputElement
      content = input.value || ''
      isEmpty = content.trim() === ''
    }
    
    console.log(`[豆包] 触发编辑器事件完成，空白内容: ${isEmpty}`)
  }

  /**
   * 触发框架特定事件（React/Vue/Angular等）
   */
  private async triggerFrameworkEvents(element: HTMLElement): Promise<void> {
    // React事件
    const reactEvents = ['onChange', 'onInput', 'onFocus', 'onBlur']
    for (const reactEvent of reactEvents) {
      if ((element as any)[reactEvent]) {
        try {
          (element as any)[reactEvent]({
            target: element,
            currentTarget: element,
            type: reactEvent.toLowerCase().replace('on', ''),
            preventDefault: () => {},
            stopPropagation: () => {}
          })
        } catch (error) {
          // 忽略React事件错误
        }
      }
    }
    
    // Vue事件
     const vueInstance = (element as any).__vue__
     if (vueInstance && vueInstance.$emit) {
       try {
         const elementValue = element.textContent || (element as any).value || ''
         vueInstance.$emit('input', elementValue)
         vueInstance.$emit('change', elementValue)
       } catch (error) {
         // 忽略Vue事件错误
       }
     }
    
    // 通用属性更新
    try {
      // 更新可能的数据绑定属性
      const possibleProps = ['value', 'textContent', 'innerText', 'innerHTML']
      for (const prop of possibleProps) {
        if (element.hasOwnProperty(prop)) {
          const descriptor = Object.getOwnPropertyDescriptor(element, prop)
          if (descriptor && descriptor.set) {
            descriptor.set.call(element, element.textContent || '')
          }
        }
      }
    } catch (error) {
      // 忽略属性更新错误
    }
  }
}

const doubaoScript = new DoubaoContentScript()
doubaoScript.init()