/**
 * Gemini专用内容脚本
 * 独立实现，无外部依赖
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: ['https://gemini.google.com/*', 'https://bard.google.com/*'],
  run_at: 'document_end'
}

// Gemini选择器配置
const INPUT_SELECTORS = [
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

const SUBMIT_SELECTORS = [
  // 新版 Gemini UI
  'button.send-button[aria-label="发送"]',
  'button.submit[aria-label="发送"]',
  'button.mdc-icon-button.send-button',
  'button.mat-mdc-icon-button.send-button',
  // 旧版选择器保持兼容
  'button[aria-label*="Send message"]',
  'button[data-testid="send-button"]',
  'button:has(mat-icon[data-mat-icon-name="send"])',
  'button mat-icon[data-mat-icon-name="send"]',
  'button[type="submit"]'
]

/**
 * 检查元素是否可见
 * @param element - 要检查的DOM元素
 * @returns 元素是否可见
 */
function isElementVisible(element: Element): boolean {
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
 * 等待元素出现
 * @param selectors - CSS选择器数组
 * @param timeout - 超时时间（毫秒）
 * @returns Promise<Element | null>
 */
function waitForElement(selectors: string[], timeout = 10000): Promise<Element | null> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    function check() {
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector)
        for (const element of elements) {
          if (isElementVisible(element)) {
            console.log(`[Gemini] 找到可见元素:`, selector, element)
            resolve(element)
            return
          }
        }
      }
      
      if (Date.now() - startTime > timeout) {
        console.log(`[Gemini] 等待元素超时:`, selectors)
        resolve(null)
        return
      }
      
      setTimeout(check, 100)
    }
    
    check()
  })
}

/**
 * 设置消息监听器
 */
function setupMessageListener() {
  console.log('[Gemini] 设置消息监听器')
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`🔍 [DEBUG] Gemini content script收到消息:`, message)
    console.log(`🔍 [DEBUG] Gemini 消息动作:`, message.action)
    console.log(`🔍 [DEBUG] Gemini 消息文本:`, message.text)
    console.log(`🔍 [DEBUG] Gemini 文本长度:`, message.text ? message.text.length : 0)
    
    // 支持标准的autoFillAndSend动作
    if (message.action === 'autoFillAndSend' && message.text) {
      console.log(`🔍 [DEBUG] Gemini: 开始自动填充和发送流程`)
      handleFillAndSend(message.text)
        .then(result => {
          console.log(`🔍 [DEBUG] Gemini: 填充并发送结果:`, result)
          sendResponse({ 
            success: result.success, 
            message: result.success ? '填充并发送成功' : '操作失败' 
          })
        })
        .catch(error => {
          console.error(`🔍 [DEBUG] Gemini: 填充并发送错误:`, error)
          sendResponse({ success: false, message: error.message })
        })
      return true
    }
    
    if (message.action === 'fillText') {
      handleFillText(message.text, message.autoSend || false)
        .then(result => {
          console.log('[Gemini] 填充文本结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[Gemini] 填充文本错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true // 保持消息通道开放
    }
    
    if (message.action === 'autoSend') {
      handleAutoSend()
        .then(result => {
          console.log('[Gemini] 自动发送结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[Gemini] 自动发送错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    
    if (message.action === 'fillAndSend') {
      handleFillAndSend(message.text)
        .then(result => {
          console.log('[Gemini] 填充并发送结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[Gemini] 填充并发送错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    
    if (message.action === 'getDebugInfo') {
      const debugInfo = getDebugInfo()
      console.log('[Gemini] 调试信息:', debugInfo)
      sendResponse(debugInfo)
      return true
    }
  })
}

/**
 * 处理文本填充
 * @param text - 要填充的文本
 * @param autoSend - 是否自动发送
 */
async function handleFillText(text: string, autoSend: boolean = false) {
  try {
    console.log(`🔍 [DEBUG] Gemini: 开始填充文本: "${text}", 自动发送: ${autoSend}`)
    console.log('🔍 [DEBUG] Gemini: 查找输入框，选择器:', INPUT_SELECTORS)
    
    const inputElement = await waitForElement(INPUT_SELECTORS, 5000)
    if (!inputElement) {
      // 尝试查找页面上所有可能的输入元素
      const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"]')
      console.log('🔍 [DEBUG] Gemini: 页面上所有输入元素:', Array.from(allInputs).map(input => ({
        tagName: input.tagName,
        className: input.className,
        role: input.getAttribute('role'),
        ariaLabel: input.getAttribute('aria-label'),
        placeholder: input.getAttribute('placeholder'),
        contenteditable: input.getAttribute('contenteditable')
      })))
      throw new Error('未找到输入框')
    }
    
    console.log('🔍 [DEBUG] Gemini: 找到输入框:', {
      tagName: inputElement.tagName,
      className: inputElement.className,
      role: inputElement.getAttribute('role'),
      ariaLabel: inputElement.getAttribute('aria-label'),
      contenteditable: inputElement.getAttribute('contenteditable')
    })
    
    // 处理不同类型的输入元素
    if (inputElement.tagName === 'TEXTAREA') {
      const input = inputElement as HTMLTextAreaElement
      input.focus()
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    } else if (inputElement.hasAttribute('contenteditable')) {
      const input = inputElement as HTMLElement
      input.focus()
      
      // 特殊处理新版 Gemini 的 ql-editor 结构
      if (input.classList.contains('ql-editor')) {
        // 清空现有内容
        input.innerHTML = ''
        // 创建新的 p 标签并设置文本
        const p = document.createElement('p')
        p.textContent = text
        input.appendChild(p)
        
        // 触发必要的事件
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
        input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
      } else {
        // 普通 contenteditable 元素
        input.textContent = text
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    } else {
      const input = inputElement as HTMLInputElement | HTMLTextAreaElement
      input.focus()
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    
    console.log('[Gemini] 文本填充成功')
    
    if (autoSend) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return await handleAutoSend()
    }
    
    return { success: true, message: '文本填充成功' }
  } catch (error) {
    console.error('[Gemini] 填充文本失败:', error)
    throw error
  }
}

/**
 * 处理自动发送
 */
async function handleAutoSend() {
  try {
    console.log('🔍 [DEBUG] Gemini: 开始自动发送')
    console.log('🔍 [DEBUG] Gemini: 查找发送按钮，选择器:', SUBMIT_SELECTORS)
    
    const submitButton = await waitForElement(SUBMIT_SELECTORS, 3000)
    if (!submitButton) {
      // 尝试查找页面上所有可能的按钮
      const allButtons = document.querySelectorAll('button')
      console.log('🔍 [DEBUG] Gemini: 页面上所有按钮:', Array.from(allButtons).map(btn => ({
        tagName: btn.tagName,
        className: btn.className,
        ariaLabel: btn.getAttribute('aria-label'),
        textContent: btn.textContent?.trim(),
        disabled: btn.disabled
      })))
      throw new Error('未找到发送按钮')
    }
    
    console.log('🔍 [DEBUG] Gemini: 找到发送按钮:', {
      tagName: submitButton.tagName,
      className: submitButton.className,
      ariaLabel: submitButton.getAttribute('aria-label'),
      textContent: submitButton.textContent?.trim()
    })
    
    const button = submitButton as HTMLButtonElement
    if (button.disabled) {
      console.log('🔍 [DEBUG] Gemini: 发送按钮被禁用')
      throw new Error('发送按钮被禁用')
    }
    
    console.log('🔍 [DEBUG] Gemini: 点击发送按钮')
    button.click()
    console.log('🔍 [DEBUG] Gemini: 自动发送成功')
    
    return { success: true, message: '自动发送成功' }
  } catch (error) {
    console.error('🔍 [DEBUG] Gemini: 自动发送失败:', error)
    throw error
  }
}

/**
 * 处理填充并发送
 * @param text - 要填充的文本
 */
async function handleFillAndSend(text: string) {
  try {
    console.log(`[Gemini] 开始填充并发送: "${text}"`)
    
    await handleFillText(text, false)
    await new Promise(resolve => setTimeout(resolve, 500))
    return await handleAutoSend()
  } catch (error) {
    console.error('[Gemini] 填充并发送失败:', error)
    throw error
  }
}

/**
 * 获取调试信息
 */
function getDebugInfo() {
  const inputElements = INPUT_SELECTORS.map(selector => {
    const elements = document.querySelectorAll(selector)
    return {
      selector,
      count: elements.length,
      visible: Array.from(elements).filter(el => isElementVisible(el)).length,
      elements: Array.from(elements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        visible: isElementVisible(el)
      }))
    }
  })
  
  const submitElements = SUBMIT_SELECTORS.map(selector => {
    const elements = document.querySelectorAll(selector)
    return {
      selector,
      count: elements.length,
      visible: Array.from(elements).filter(el => isElementVisible(el)).length,
      elements: Array.from(elements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        visible: isElementVisible(el),
        disabled: (el as HTMLButtonElement).disabled
      }))
    }
  })
  
  return {
    platform: 'gemini',
    url: window.location.href,
    inputElements,
    submitElements,
    timestamp: new Date().toISOString()
  }
}

// 初始化
setupMessageListener()
console.log('[Gemini] Content script已加载')