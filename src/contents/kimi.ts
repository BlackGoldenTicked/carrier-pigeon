/**
 * Kimi专用内容脚本
 * 独立实现，无外部依赖
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: [
    // 原有域名
    'https://kimi.moonshot.cn/*',
    'https://kimi.ai/*',
    'https://kimi.com/*',
    // 子域名通配
    'https://*.kimi.moonshot.cn/*',
    'https://*.kimi.ai/*',
    'https://*.kimi.com/*'
  ],
  run_at: 'document_end',
  all_frames: true
}



// Kimi选择器配置
const INPUT_SELECTORS = [
  // 新的Lexical编辑器选择器（基于用户提供的实际DOM结构）
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
  '[data-testid="chat-input"]',
  '.chat-textarea',
  '.input-textarea'
]

const SEND_BUTTON_SELECTORS = [
  // 基于用户提供的实际DOM结构的精确选择器
  'div.send-button-container div.send-button',
  'div.send-button-container:not(.disabled) div.send-button',
  'div[data-v-33aac482].send-button-container div[data-v-33aac482].send-button',
  
  // SVG图标选择器（基于实际结构）
  'svg.send-icon.iconify[name="Send"]',
  'svg[name="Send"][class*="send-icon"]',
  'div.send-button svg[name="Send"]',
  
  // 容器选择器
  'div.send-button-container',
  'div.send-button',
  
  // 通用发送按钮选择器（保持向后兼容）
  'button[data-testid="send-button"]',
  'button:has(svg)',
  'button[aria-label*="发送"]',
  'button[title*="发送"]',
  '.send-button',
  '.chat-send-button',
  'button:contains("发送")',
  '[data-testid="send"]',
  '.send-btn',
  'button[type="submit"]'
]

/**
 * 检查元素是否可见
 */
function isElementVisible(element: Element): boolean {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  return rect.width > 0 && rect.height > 0 && 
         style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0'
}

/**
 * 等待元素出现
 */
function waitForElement(selectors: string[], timeout = 10000): Promise<Element | null> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    function check() {
      for (const selector of selectors) {
        const element = document.querySelector(selector)
        if (element && isElementVisible(element)) {
          resolve(element)
          return
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
 * 在Shadow DOM中查找元素
 */
function findInShadowDOM(selectors: string[]): HTMLElement | null {
  const shadowHosts = [...document.querySelectorAll('*')].filter(el => el.shadowRoot)
  
  for (const host of shadowHosts) {
    if (!host.shadowRoot) continue
    
    for (const selector of selectors) {
      try {
        const element = host.shadowRoot.querySelector(selector) as HTMLElement
        if (element && isElementVisible(element)) {
          console.log('🌑 [Kimi] 在Shadow DOM中找到编辑器:', selector, host)
          return element
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
  }
  
  return null
}

/**
 * 在iframe中查找元素
 */
function findInIframes(selectors: string[]): HTMLElement | null {
  const iframes = document.querySelectorAll('iframe')
  
  for (const iframe of iframes) {
    try {
      // 检查是否可以访问iframe内容（同域检查）
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) continue
      
      for (const selector of selectors) {
        try {
          const element = iframeDoc.querySelector(selector) as HTMLElement
          if (element && isElementVisible(element)) {
            console.log('🖼️ [Kimi] 在iframe中找到编辑器:', selector, iframe)
            return element
          }
        } catch (e) {
          // 忽略选择器错误
        }
      }
    } catch (e) {
      // 跨域iframe，无法访问
      console.log('🔒 [Kimi] 跨域iframe，无法访问:', iframe.src)
    }
  }
  
  return null
}

/**
 * 查找Kimi编辑器元素（增强版：支持Shadow DOM和iframe）
 */
function findKimiEditor(): HTMLElement | null {
  // 优先查找Lexical编辑器选择器
  const lexicalSelectors = [
    '.chat-input-editor [contenteditable="true"]',
    '.chat-input-editor[data-lexical-editor="true"][contenteditable="true"]',
    '.chat-input-editor[contenteditable="true"]',
    'div[data-lexical-editor="true"][contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]'
  ]
  
  // 1. 在主文档中查找
  console.log('🔍 [Kimi] 在主文档中查找编辑器...')
  for (const selector of lexicalSelectors) {
    try {
      const element = document.querySelector(selector) as HTMLElement
      if (element && isElementVisible(element)) {
        console.log('🎯 [Kimi] 在主文档中找到Lexical编辑器:', selector)
        return element
      }
    } catch (e) {
      console.warn('🔍 [Kimi] 选择器无效:', selector, e)
    }
  }
  
  // 2. 在Shadow DOM中查找
  console.log('🔍 [Kimi] 在Shadow DOM中查找编辑器...')
  const shadowElement = findInShadowDOM(lexicalSelectors)
  if (shadowElement) return shadowElement
  
  // 3. 在iframe中查找
  console.log('🔍 [Kimi] 在iframe中查找编辑器...')
  const iframeElement = findInIframes(lexicalSelectors)
  if (iframeElement) return iframeElement
  
  // 4. 兜底：使用所有选择器在主文档中查找
  console.log('🔍 [Kimi] 使用兜底选择器在主文档中查找...')
  for (const selector of INPUT_SELECTORS) {
    try {
      const element = document.querySelector(selector) as HTMLElement
      if (element && isElementVisible(element)) {
        console.log('🎯 [Kimi] 找到兜底编辑器:', selector)
        return element
      }
    } catch (e) {
      // 忽略选择器错误
    }
  }
  
  // 5. 兜底：在Shadow DOM中使用所有选择器查找
  console.log('🔍 [Kimi] 在Shadow DOM中使用兜底选择器查找...')
  const shadowFallback = findInShadowDOM(INPUT_SELECTORS)
  if (shadowFallback) return shadowFallback
  
  // 6. 兜底：在iframe中使用所有选择器查找
  console.log('🔍 [Kimi] 在iframe中使用兜底选择器查找...')
  const iframeFallback = findInIframes(INPUT_SELECTORS)
  if (iframeFallback) return iframeFallback
  
  console.error('❌ [Kimi] 在所有位置都未找到编辑器')
  return null
}

/**
 * 检查编辑器是否包含指定文本
 */
function editorContainsText(editor: HTMLElement, text: string): boolean {
  const content = editor.innerText || editor.textContent || (editor as any).value || ''
  return content.trim().includes(text.trim())
}

/**
 * 策略1: 使用execCommand进行文本插入（适用于大多数富文本编辑器）
 */
async function tryExecCommandInjection(editor: HTMLElement, text: string): Promise<boolean> {
  try {
    console.log('🧪 [Kimi] 尝试execCommand注入策略')
    
    // 聚焦编辑器
    editor.focus()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 选择所有内容并删除
    document.execCommand('selectAll', false)
    document.execCommand('delete', false)
    
    // 插入新文本
    const success = document.execCommand('insertText', false, text)
    
    // 触发input事件
    editor.dispatchEvent(new Event('input', { bubbles: true }))
    editor.dispatchEvent(new Event('change', { bubbles: true }))
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const hasText = editorContainsText(editor, text)
    console.log('🧪 [Kimi] execCommand结果:', { success, hasText, content: editor.innerText?.substring(0, 50) })
    
    return hasText
  } catch (error) {
    console.warn('⚠️ [Kimi] execCommand注入失败:', error)
    return false
  }
}

/**
 * 策略2: 使用beforeinput/input事件模拟粘贴（适用于Lexical等现代编辑器）
 */
async function tryInputEventInjection(editor: HTMLElement, text: string): Promise<boolean> {
  try {
    console.log('🧪 [Kimi] 尝试InputEvent注入策略')
    
    editor.focus()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 清空现有内容
    const selection = window.getSelection()
    if (selection) {
      const range = document.createRange()
      range.selectNodeContents(editor)
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand('delete', false)
    }
    
    // 触发beforeinput事件
    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertFromPaste',
      data: text,
      bubbles: true,
      cancelable: true
    })
    const beforeResult = editor.dispatchEvent(beforeInputEvent)
    
    // 触发input事件
    const inputEvent = new InputEvent('input', {
      inputType: 'insertFromPaste',
      data: text,
      bubbles: true
    })
    const inputResult = editor.dispatchEvent(inputEvent)
    
    // 触发组合输入事件（某些框架需要）
    editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    editor.dispatchEvent(new CompositionEvent('compositionupdate', { data: text, bubbles: true }))
    editor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const hasText = editorContainsText(editor, text)
    console.log('🧪 [Kimi] InputEvent结果:', { beforeResult, inputResult, hasText, content: editor.innerText?.substring(0, 50) })
    
    return hasText
  } catch (error) {
    console.warn('⚠️ [Kimi] InputEvent注入失败:', error)
    return false
  }
}

/**
 * 策略3: 直接构建Lexical DOM结构（专门针对Lexical编辑器）
 */
async function tryLexicalDOMInjection(editor: HTMLElement, text: string): Promise<boolean> {
  try {
    console.log('🧪 [Kimi] 尝试Lexical DOM注入策略')
    
    editor.focus()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 清空编辑器
    editor.innerHTML = ''
    
    // 构建Lexical段落结构
    const paragraph = document.createElement('p')
    paragraph.setAttribute('dir', 'ltr')
    
    const textSpan = document.createElement('span')
    textSpan.setAttribute('data-lexical-text', 'true')
    textSpan.textContent = text
    
    paragraph.appendChild(textSpan)
    editor.appendChild(paragraph)
    
    // 触发必要的事件
    editor.dispatchEvent(new Event('input', { bubbles: true }))
    editor.dispatchEvent(new Event('change', { bubbles: true }))
    
    // 设置光标到文本末尾
    const selection = window.getSelection()
    if (selection) {
      const range = document.createRange()
      range.setStartAfter(textSpan)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const hasText = editorContainsText(editor, text)
    console.log('🧪 [Kimi] Lexical DOM结果:', { hasText, content: editor.innerText?.substring(0, 50) })
    
    return hasText
  } catch (error) {
    console.warn('⚠️ [Kimi] Lexical DOM注入失败:', error)
    return false
  }
}

/**
 * 策略4: 模拟键盘逐字符输入（最后的兜底策略）
 */
async function tryKeyboardSimulation(editor: HTMLElement, text: string): Promise<boolean> {
  try {
    console.log('🧪 [Kimi] 尝试键盘模拟注入策略')
    
    editor.focus()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 清空现有内容
    document.execCommand('selectAll', false)
    document.execCommand('delete', false)
    
    // 逐字符输入
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      // 触发键盘事件序列
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }))
      editor.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }))
      editor.dispatchEvent(new InputEvent('input', { data: char, inputType: 'insertText', bubbles: true }))
      editor.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }))
      
      // 短暂延迟模拟真实输入
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const hasText = editorContainsText(editor, text)
    console.log('🧪 [Kimi] 键盘模拟结果:', { hasText, content: editor.innerText?.substring(0, 50) })
    
    return hasText
  } catch (error) {
    console.warn('⚠️ [Kimi] 键盘模拟注入失败:', error)
    return false
  }
}

/**
 * 策略5: 直接设置内容（传统输入框兜底）
 */
async function tryDirectContentSet(editor: HTMLElement, text: string): Promise<boolean> {
  try {
    console.log('🧪 [Kimi] 尝试直接内容设置策略')
    
    editor.focus()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 根据元素类型选择设置方式
    if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
      (editor as HTMLInputElement).value = text
    } else if (editor.contentEditable === 'true') {
      editor.textContent = text
    } else {
      editor.innerText = text
    }
    
    // 触发事件
    editor.dispatchEvent(new Event('input', { bubbles: true }))
    editor.dispatchEvent(new Event('change', { bubbles: true }))
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const hasText = editorContainsText(editor, text)
    console.log('🧪 [Kimi] 直接设置结果:', { hasText, content: editor.innerText?.substring(0, 50) })
    
    return hasText
  } catch (error) {
    console.warn('⚠️ [Kimi] 直接设置失败:', error)
    return false
  }
}

/**
 * 处理文本填充的主函数
 * @param text 要填充的文本
 * @returns Promise<boolean> 是否成功
 */
async function handleFillText(text: string): Promise<boolean> {
  // 第一层：使用增强的编辑器查找
  let editor = findKimiEditor()
  
  if (!editor) {
    // 等待一段时间后重试
    await new Promise(resolve => setTimeout(resolve, 1000))
    editor = findKimiEditor()
  }
  
  if (!editor) {
    // 使用waitForElement等待
    const waitedElement = await waitForElement([
      '.chat-input-editor [contenteditable="true"]',
      'div[data-lexical-editor="true"][contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]',
      ...INPUT_SELECTORS
    ], 5000)
    
    if (waitedElement) {
      editor = waitedElement as HTMLElement
    }
  }
  
  if (!editor) {
    console.error('❌ [Kimi] 无法找到编辑器')
    return false
  }
  
  // 检查编辑器是否已有内容
  if (editorContainsText(editor, text)) {
    return true
  }
  
  // 注入策略列表（按优先级排序）
  const injectionStrategies = [
    { name: 'Lexical DOM构建', fn: tryLexicalDOMInjection },
    { name: 'InputEvent模拟粘贴', fn: tryInputEventInjection },
    { name: 'execCommand插入', fn: tryExecCommandInjection },
    { name: '键盘模拟输入', fn: tryKeyboardSimulation },
    { name: '直接内容设置', fn: tryDirectContentSet }
  ]
  
  // 尝试每种策略
  for (const strategy of injectionStrategies) {
    try {
      const success = await strategy.fn(editor, text)
      
      if (success) {
        // 验证注入是否真的成功
        await new Promise(resolve => setTimeout(resolve, 100))
        if (editorContainsText(editor, text)) {
          return true
        }
      }
    } catch (error) {
      console.error(`❌ [Kimi] 策略 "${strategy.name}" 异常:`, error)
    }
  }
  
  // 所有策略都失败后的最后兜底
  try {
    // 兜底1：强制聚焦后重试最简单的方法
    editor.focus()
    editor.click()
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 清空内容
    if (editor.textContent) {
      editor.textContent = ''
    }
    if (editor.innerHTML) {
      editor.innerHTML = ''
    }
    
    // 直接设置
    editor.textContent = text
    editor.innerHTML = text
    
    // 触发事件
    const inputEvent = new Event('input', { bubbles: true })
    editor.dispatchEvent(inputEvent)
    
    const changeEvent = new Event('change', { bubbles: true })
    editor.dispatchEvent(changeEvent)
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (editorContainsText(editor, text)) {
      return true
    }
  } catch (error) {
    console.error('❌ [Kimi] 兜底方案1失败:', error)
  }
  
  try {
    // 兜底2：尝试在父容器中查找其他可能的输入元素
    const container = editor.closest('.chat-input-editor, .chat-input, .input-container')
    if (container) {
      const alternativeInputs = container.querySelectorAll('input, textarea, [contenteditable="true"]')
      
      for (const input of alternativeInputs) {
        if (input !== editor && isElementVisible(input as HTMLElement)) {
          try {
             const htmlElement = input as HTMLElement
             const htmlInput = input as HTMLInputElement | HTMLTextAreaElement
             
             if ('value' in htmlInput) {
               htmlInput.value = text
               htmlInput.dispatchEvent(new Event('input', { bubbles: true }))
               htmlInput.dispatchEvent(new Event('change', { bubbles: true }))
             } else {
               htmlElement.textContent = text
               htmlElement.dispatchEvent(new Event('input', { bubbles: true }))
             }
             
             await new Promise(resolve => setTimeout(resolve, 100))
             
             // 检查是否成功
             const hasValue = ('value' in htmlInput && htmlInput.value === text) || 
                            (htmlElement.textContent?.includes(text))
             
             if (hasValue) {
               return true
             }
           } catch (error) {
             console.error('❌ [Kimi] 替代元素注入失败:', error)
           }
        }
      }
    }
  } catch (error) {
    console.error('❌ [Kimi] 兜底方案2失败:', error)
  }
  
  console.error('❌ [Kimi] 所有注入方案都失败了')
  return false
}

/**
 * 处理自动发送
 */
async function handleAutoSend(): Promise<{ success: boolean; message: string }> {
  try {
    // 等待发送按钮出现
    const sendButton = await waitForElement(SEND_BUTTON_SELECTORS, 5000)
    
    if (!sendButton) {
      throw new Error('未找到发送按钮')
    }
    
    // 检查是否是容器，如果是则查找内部的实际按钮
    let actualButton = sendButton
    if (sendButton.classList.contains('send-button-container')) {
      const innerButton = sendButton.querySelector('.send-button')
      if (innerButton) {
        actualButton = innerButton
      }
    }
    
    // 检查按钮是否被禁用（通过类名）
    if (sendButton.classList.contains('disabled')) {
      // 等待最多3秒让按钮启用
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        if (!sendButton.classList.contains('disabled')) {
          break
        }
      }
      
      if (sendButton.classList.contains('disabled')) {
        throw new Error('发送按钮仍然被禁用')
      }
    }
    
    // 多种点击策略
    const clickStrategies = [
      {
        name: '直接点击实际按钮',
        action: () => (actualButton as HTMLElement).click()
      },
      {
        name: '点击容器',
        action: () => (sendButton as HTMLElement).click()
      },
      {
        name: 'MouseEvent点击',
        action: () => {
          actualButton.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          }))
        }
      },
      {
        name: '点击SVG图标',
        action: () => {
          const svg = actualButton.querySelector('svg[name="Send"]')
          if (svg) {
            (svg as HTMLElement).click()
          }
        }
      }
    ]
    
    let success = false
    for (const strategy of clickStrategies) {
      try {
        strategy.action()
        success = true
        break
      } catch (error) {
        console.error(`❌ [Kimi] 策略 "${strategy.name}" 失败:`, error)
      }
    }
    
    if (!success) {
      throw new Error('所有点击策略都失败了')
    }
    
    return { success: true, message: '自动发送成功' }
    
  } catch (error) {
    console.error('❌ [Kimi] 自动发送失败:', error)
    return { success: false, message: error instanceof Error ? error.message : '未知错误' }
  }
}

/**
 * 整合文本填充和自动发送的函数
 * @param text 要填充的文本
 * @returns Promise<{success: boolean, message: string}>
 */
async function handleFillAndSend(text: string): Promise<{success: boolean, message: string}> {
  try {
    // 第一步：填充文本
    const fillSuccess = await handleFillText(text)
    
    if (!fillSuccess) {
      return {
        success: false,
        message: '文本填充失败'
      }
    }
    
    // 第二步：自动发送
    const sendResult = await handleAutoSend()
    
    if (sendResult.success) {
      return {
        success: true,
        message: '文本填充和发送成功'
      }
    } else {
      return {
        success: false,
        message: `文本填充成功，但发送失败: ${sendResult.message}`
      }
    }
  } catch (error) {
    console.error('❌ [Kimi] fillAndSend操作失败:', error)
    return {
      success: false,
      message: `操作失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}



// 处理来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.action === 'fillText') {
    handleFillText(message.text).then(success => {
      if (success && message.autoSend) {
        return handleAutoSend()
      }
      return { success, message: success ? '文本填充成功' : '文本填充失败' }
    }).then(result => {
      sendResponse({ success: true, result })
    }).catch(error => {
      console.error('❌ [Kimi] 处理消息失败:', error)
      sendResponse({ success: false, error: error.message })
    })
    return true // 保持消息通道开放
  }
  
  if (message.action === 'autoSend') {
    handleAutoSend().then(result => {
      sendResponse({ success: true, result })
    }).catch(error => {
      console.error('❌ [Kimi] 自动发送失败:', error)
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // 支持标准的autoFillAndSend动作
  if (message.action === 'autoFillAndSend' && message.text) {
    handleFillAndSend(message.text).then(result => {
      sendResponse({ success: true, result })
    }).catch(error => {
      console.error('❌ [Kimi] autoFillAndSend失败:', error)
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // 支持fillAndSend动作
  if (message.action === 'fillAndSend') {
    handleFillAndSend(message.text).then(result => {
      sendResponse({ success: true, result })
    }).catch(error => {
      console.error('❌ [Kimi] fillAndSend失败:', error)
      sendResponse({ success: false, error: error.message })
    })
    return true
  }
})