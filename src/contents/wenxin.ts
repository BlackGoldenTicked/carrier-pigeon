/**
 * 文心一言专用内容脚本
 * 独立实现，无外部依赖
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: ['https://yiyan.baidu.com/*', 'https://wenxin.baidu.com/*'],
  run_at: 'document_end'
}

// 文心一言选择器配置
const INPUT_SELECTORS = [
  'textarea[placeholder*="请输入你想问的问题"]',
  'textarea[placeholder*="输入消息"]',
  'div[contenteditable="true"]',
  'textarea[data-testid="chat-input"]',
  'div[role="textbox"]'
]

const SUBMIT_SELECTORS = [
  'button[aria-label="发送"]',
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
            console.log(`[文心一言] 找到可见元素:`, selector, element)
            resolve(element)
            return
          }
        }
      }
      
      if (Date.now() - startTime > timeout) {
        console.log(`[文心一言] 等待元素超时:`, selectors)
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
  console.log('[文心一言] 设置消息监听器')
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[文心一言] 收到消息:', message)
    
    if (message.action === 'fillText') {
      handleFillText(message.text, message.autoSend || false)
        .then(result => {
          console.log('[文心一言] 填充文本结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[文心一言] 填充文本错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true // 保持消息通道开放
    }
    
    if (message.action === 'autoSend') {
      handleAutoSend()
        .then(result => {
          console.log('[文心一言] 自动发送结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[文心一言] 自动发送错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    
    if (message.action === 'fillAndSend') {
      handleFillAndSend(message.text)
        .then(result => {
          console.log('[文心一言] 填充并发送结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[文心一言] 填充并发送错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    
    if (message.action === 'getDebugInfo') {
      const debugInfo = getDebugInfo()
      console.log('[文心一言] 调试信息:', debugInfo)
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
    console.log(`[文心一言] 开始填充文本: "${text}", 自动发送: ${autoSend}`)
    
    const inputElement = await waitForElement(INPUT_SELECTORS, 5000)
    if (!inputElement) {
      throw new Error('未找到输入框')
    }
    
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
      input.textContent = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      const input = inputElement as HTMLInputElement | HTMLTextAreaElement
      input.focus()
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    
    console.log('[文心一言] 文本填充成功')
    
    if (autoSend) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return await handleAutoSend()
    }
    
    return { success: true, message: '文本填充成功' }
  } catch (error) {
    console.error('[文心一言] 填充文本失败:', error)
    throw error
  }
}

/**
 * 处理自动发送
 */
async function handleAutoSend() {
  try {
    console.log('[文心一言] 开始自动发送')
    
    const submitButton = await waitForElement(SUBMIT_SELECTORS, 3000)
    if (!submitButton) {
      throw new Error('未找到发送按钮')
    }
    
    const button = submitButton as HTMLButtonElement
    if (button.disabled) {
      throw new Error('发送按钮被禁用')
    }
    
    button.click()
    console.log('[文心一言] 自动发送成功')
    
    return { success: true, message: '自动发送成功' }
  } catch (error) {
    console.error('[文心一言] 自动发送失败:', error)
    throw error
  }
}

/**
 * 处理填充并发送
 * @param text - 要填充的文本
 */
async function handleFillAndSend(text: string) {
  try {
    console.log(`[文心一言] 开始填充并发送: "${text}"`)
    
    await handleFillText(text, false)
    await new Promise(resolve => setTimeout(resolve, 500))
    return await handleAutoSend()
  } catch (error) {
    console.error('[文心一言] 填充并发送失败:', error)
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
    platform: 'wenxin',
    url: window.location.href,
    inputElements,
    submitElements,
    timestamp: new Date().toISOString()
  }
}

// 初始化
setupMessageListener()
console.log('[文心一言] Content script已加载')