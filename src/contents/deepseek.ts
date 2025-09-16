/**
 * DeepSeek专用内容脚本
 * 独立实现，无外部依赖
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: ['https://chat.deepseek.com/*', 'https://www.deepseek.com/*'],
  run_at: 'document_end'
}

// DeepSeek选择器配置
const INPUT_SELECTORS = [
  // 新版 DeepSeek UI
  'textarea[placeholder*="给 DeepSeek 发送消息"]',
  'textarea._27c9245',
  'textarea.ds-scroll-area',
  'textarea.d96f2d2a',
  // 旧版选择器（保持兼容性）
  'textarea[placeholder*="Send a message"]',
  'textarea[placeholder*="输入消息"]',
  'div[contenteditable="true"]',
  'textarea[data-testid="chat-input"]',
  'div[role="textbox"]'
]

const SUBMIT_SELECTORS = [
  // 最新版 DeepSeek UI - 精确匹配
  'div._17e543b._7436101[role="button"]:not([aria-disabled="true"])',
  'div._17e543b[role="button"]:not([aria-disabled="true"])',
  'div._7436101[role="button"]:not([aria-disabled="true"])',
  // 包含发送图标的按钮
  'div[role="button"]:not([aria-disabled="true"]) svg[viewBox="0 0 16 16"] path[d*="M8.3125"]',
  'div[role="button"]:not([aria-disabled="true"]) svg[viewBox="0 0 16 16"]',
  'div[role="button"]:not([aria-disabled="true"]) .ds-icon',
  // 其他新版选择器
  'div.bcc55ca1[role="button"]:not([aria-disabled="true"])',
  'div._308c14b[role="button"]:not([aria-disabled="true"])',
  // 旧版选择器（保持兼容性）
  'button[aria-label="Send message"]',
  'button[data-testid="send-button"]',
  'button:has(svg[data-icon="send"])',
  'button svg[data-icon="send"]',
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
            console.log(`[DeepSeek] 找到可见元素:`, selector, element)
            resolve(element)
            return
          }
        }
      }
      
      if (Date.now() - startTime > timeout) {
        console.log(`[DeepSeek] 等待元素超时:`, selectors)
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
  console.log('[DeepSeek] 设置消息监听器')
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`🔍 [DEBUG] DeepSeek content script收到消息:`, message)
    console.log(`🔍 [DEBUG] DeepSeek 消息动作:`, message.action)
    console.log(`🔍 [DEBUG] DeepSeek 消息文本:`, message.text)
    console.log(`🔍 [DEBUG] DeepSeek 文本长度:`, message.text ? message.text.length : 0)
    
    // 支持标准的autoFillAndSend动作
    if (message.action === 'autoFillAndSend' && message.text) {
      console.log(`🔍 [DEBUG] DeepSeek: 开始自动填充和发送流程`)
      handleFillAndSend(message.text)
        .then(result => {
          console.log(`🔍 [DEBUG] DeepSeek: 填充并发送结果:`, result)
          sendResponse({ 
            success: result.success, 
            message: result.success ? '填充并发送成功' : '操作失败' 
          })
        })
        .catch(error => {
          console.error(`🔍 [DEBUG] DeepSeek: 填充并发送错误:`, error)
          sendResponse({ success: false, message: error.message })
        })
      return true
    }
    
    if (message.action === 'fillText') {
      handleFillText(message.text, message.autoSend || false)
        .then(result => {
          console.log('[DeepSeek] 填充文本结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[DeepSeek] 填充文本错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true // 保持消息通道开放
    }
    
    if (message.action === 'autoSend') {
      handleAutoSend()
        .then(result => {
          console.log('[DeepSeek] 自动发送结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[DeepSeek] 自动发送错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    
    if (message.action === 'fillAndSend') {
      handleFillAndSend(message.text)
        .then(result => {
          console.log('[DeepSeek] 填充并发送结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[DeepSeek] 填充并发送错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    
    if (message.action === 'getDebugInfo') {
      const debugInfo = getDebugInfo()
      console.log('[DeepSeek] 调试信息:', debugInfo)
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
    console.log(`🔍 [DEBUG] DeepSeek: 开始填充文本: "${text}", 自动发送: ${autoSend}`)
    console.log('🔍 [DEBUG] DeepSeek: 查找输入框，选择器:', INPUT_SELECTORS)
    
    const inputElement = await waitForElement(INPUT_SELECTORS, 5000)
    if (!inputElement) {
      // 尝试查找页面上所有可能的输入元素
      const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"]')
      console.log('🔍 [DEBUG] DeepSeek: 页面上所有输入元素:', Array.from(allInputs).map(input => ({
        tagName: input.tagName,
        className: input.className,
        placeholder: input.getAttribute('placeholder'),
        contenteditable: input.getAttribute('contenteditable')
      })))
      throw new Error('未找到输入框')
    }
    
    console.log('🔍 [DEBUG] DeepSeek: 找到输入框:', {
      tagName: inputElement.tagName,
      className: inputElement.className,
      placeholder: inputElement.getAttribute('placeholder'),
      contenteditable: inputElement.getAttribute('contenteditable')
    })
    
    // 处理不同类型的输入元素
    if (inputElement.tagName === 'TEXTAREA') {
      const input = inputElement as HTMLTextAreaElement
      console.log('🔍 [DEBUG] DeepSeek: 处理 TEXTAREA 元素')
      input.focus()
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      // 触发额外事件以确保 DeepSeek 识别内容变化
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
    } else if (inputElement.hasAttribute('contenteditable')) {
      const input = inputElement as HTMLElement
      console.log('🔍 [DEBUG] DeepSeek: 处理 contenteditable 元素')
      input.focus()
      input.textContent = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      const input = inputElement as HTMLInputElement | HTMLTextAreaElement
      console.log('🔍 [DEBUG] DeepSeek: 处理其他输入元素')
      input.focus()
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    
    console.log('[DeepSeek] 文本填充成功')
    
    if (autoSend) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return await handleAutoSend()
    }
    
    return { success: true, message: '文本填充成功' }
  } catch (error) {
    console.error('[DeepSeek] 填充文本失败:', error)
    throw error
  }
}

/**
 * 验证是否为有效的发送按钮
 * @param element - 要验证的元素
 * @returns 是否为有效的发送按钮
 */
function isValidSendButton(element: Element): boolean {
  // 检查是否被禁用
  const isDisabled = element.tagName === 'BUTTON' 
    ? (element as HTMLButtonElement).disabled
    : element.getAttribute('aria-disabled') === 'true'
  
  if (isDisabled) {
    return false
  }
  
  // 检查 DeepSeek 特定的类名
  const className = element.className || ''
  if (className.includes('_17e543b') || className.includes('_7436101')) {
    console.log('🔍 [DEBUG] DeepSeek: 找到 DeepSeek 特定按钮类名')
    return true
  }
  
  // 检查是否包含发送图标
  const svgElement = element.querySelector('svg[viewBox="0 0 16 16"]')
  if (svgElement) {
    const pathElement = svgElement.querySelector('path[d*="M8.3125"]')
    if (pathElement) {
      console.log('🔍 [DEBUG] DeepSeek: 找到发送图标路径')
      return true
    }
  }
  
  // 检查是否包含 ds-icon 类
  const iconElement = element.querySelector('.ds-icon')
  if (iconElement) {
    console.log('🔍 [DEBUG] DeepSeek: 找到 ds-icon 元素')
    return true
  }
  
  return false
}

/**
 * 点击发送按钮的多种策略
 * @param button - 发送按钮元素
 * @returns 是否点击成功
 */
function clickSendButton(button: Element): boolean {
  const element = button as HTMLElement
  
  try {
    // 方法1: 直接点击
    console.log('🔍 [DEBUG] DeepSeek: 尝试方法1 - 直接点击')
    element.click()
    return true
  } catch (error) {
    console.log('🔍 [DEBUG] DeepSeek: 方法1失败，尝试方法2')
  }
  
  try {
    // 方法2: 模拟鼠标事件
    console.log('🔍 [DEBUG] DeepSeek: 尝试方法2 - 模拟鼠标事件')
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    })
    element.dispatchEvent(clickEvent)
    return true
  } catch (error) {
    console.log('🔍 [DEBUG] DeepSeek: 方法2失败，尝试方法3')
  }
  
  try {
    // 方法3: 触发 mousedown 和 mouseup
    console.log('🔍 [DEBUG] DeepSeek: 尝试方法3 - mousedown/mouseup')
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  } catch (error) {
    console.log('🔍 [DEBUG] DeepSeek: 方法3失败')
  }
  
  return false
}

/**
 * 处理自动发送
 */
async function handleAutoSend() {
  try {
    console.log('🔍 [DEBUG] DeepSeek: 开始自动发送')
    console.log('🔍 [DEBUG] DeepSeek: 查找发送按钮，选择器:', SUBMIT_SELECTORS)
    
    let submitButton = await waitForElement(SUBMIT_SELECTORS, 3000)
    
    // 如果没找到，尝试更广泛的搜索
    if (!submitButton) {
      console.log('🔍 [DEBUG] DeepSeek: 使用选择器未找到，尝试广泛搜索')
      const allButtons = document.querySelectorAll('div[role="button"], button')
      
      for (const btn of allButtons) {
        if (isElementVisible(btn) && isValidSendButton(btn)) {
          submitButton = btn
          console.log('🔍 [DEBUG] DeepSeek: 通过广泛搜索找到发送按钮')
          break
        }
      }
    }
    
    if (!submitButton) {
      // 调试信息：显示页面上所有可能的按钮
      const allButtons = document.querySelectorAll('button, div[role="button"], [tabindex]')
      console.log('🔍 [DEBUG] DeepSeek: 页面上所有按钮元素:', Array.from(allButtons).map(btn => ({
        tagName: btn.tagName,
        className: btn.className,
        role: btn.getAttribute('role'),
        ariaDisabled: btn.getAttribute('aria-disabled'),
        disabled: (btn as HTMLButtonElement).disabled,
        visible: isElementVisible(btn)
      })))
      throw new Error('未找到发送按钮')
    }
    
    console.log('🔍 [DEBUG] DeepSeek: 找到发送按钮:', {
      tagName: submitButton.tagName,
      className: submitButton.className,
      role: submitButton.getAttribute('role'),
      ariaDisabled: submitButton.getAttribute('aria-disabled'),
      disabled: (submitButton as HTMLButtonElement).disabled
    })
    
    // 最终验证按钮状态
    if (!isValidSendButton(submitButton)) {
      throw new Error('发送按钮被禁用或无效')
    }
    
    // 尝试点击按钮
    const clickSuccess = clickSendButton(submitButton)
    if (!clickSuccess) {
      throw new Error('所有点击方法都失败了')
    }
    
    console.log('🔍 [DEBUG] DeepSeek: 自动发送成功')
    return { success: true, message: '自动发送成功' }
  } catch (error) {
    console.error('[DeepSeek] 自动发送失败:', error)
    throw error
  }
}

/**
 * 处理填充并发送
 * @param text - 要填充的文本
 */
async function handleFillAndSend(text: string) {
  try {
    console.log(`[DeepSeek] 开始填充并发送: "${text}"`)
    
    await handleFillText(text, false)
    await new Promise(resolve => setTimeout(resolve, 500))
    return await handleAutoSend()
  } catch (error) {
    console.error('[DeepSeek] 填充并发送失败:', error)
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
    platform: 'deepseek',
    url: window.location.href,
    inputElements,
    submitElements,
    timestamp: new Date().toISOString()
  }
}

// 初始化
setupMessageListener()
console.log('[DeepSeek] Content script已加载')