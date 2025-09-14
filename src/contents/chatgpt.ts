/**
 * ChatGPT专用内容脚本
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: ['https://chat.openai.com/*', 'https://chatgpt.com/*'],
  run_at: 'document_end'
}

// ChatGPT选择器配置
const INPUT_SELECTORS = [
  'textarea[data-id="root"]',
  '#prompt-textarea',
  'textarea[placeholder*="Message"]',
  'textarea[placeholder*="Send a message"]',
  'div[contenteditable="true"][data-id="root"]',
  'div[contenteditable="true"] p'
]

const SUBMIT_SELECTORS = [
  'button[data-testid="send-button"]',
  'button[aria-label="Send prompt"]',
  'button[aria-label="Send message"]',
  'button svg[data-icon="arrow-up"]',
  'button:has(svg[data-icon="arrow-up"])',
  '[data-testid="send-button"]'
]

/**
 * 检查元素是否可见
 */
function isElementVisible(element: HTMLElement): boolean {
  if (!element) return false
  
  const style = window.getComputedStyle(element)
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  )
}

/**
 * 等待元素出现
 */
function waitForElement(
  selector: string,
  timeout: number = 10000,
  interval: number = 100
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    const checkElement = () => {
      const element = document.querySelector(selector) as HTMLElement
      
      if (element && isElementVisible(element)) {
        resolve(element)
        return
      }
      
      if (Date.now() - startTime >= timeout) {
        console.warn(`等待元素超时: ${selector}`)
        resolve(null)
        return
      }
      
      setTimeout(checkElement, interval)
    }
    
    checkElement()
  })
}

/**
 * 查找输入元素
 */
async function findInputElement(
  selectors: string[],
  shouldWait: boolean = false
): Promise<HTMLElement | null> {
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement
    if (element && isElementVisible(element)) {
      return element
    }
    if (shouldWait) {
      const waitedElement = await waitForElement(selector, 5000)
      if (waitedElement) return waitedElement
    }
  }
  return null
}

/**
 * 查找发送按钮
 */
async function findSendButton(
  selectors: string[],
  shouldWait: boolean = false
): Promise<HTMLElement | null> {
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement
    if (element && isElementVisible(element)) {
      return element
    }
    if (shouldWait) {
      const waitedElement = await waitForElement(selector, 5000)
      if (waitedElement) return waitedElement
    }
  }
  return null
}

/**
 * 填充文本到输入框
 */
function fillText(inputElement: HTMLElement, text: string): boolean {
  try {
    console.log(`🔍 [DEBUG] ChatGPT: 开始填充文本到元素:`, inputElement)
    console.log(`🔍 [DEBUG] ChatGPT: 要填充的文本:`, text)
    
    // 清空现有内容
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      const input = inputElement as HTMLInputElement | HTMLTextAreaElement
      input.value = ''
      input.value = text
      
      // 触发input事件
      inputElement.dispatchEvent(new Event('input', { bubbles: true }))
      inputElement.dispatchEvent(new Event('change', { bubbles: true }))
    } else if (inputElement.contentEditable === 'true') {
      inputElement.textContent = ''
      inputElement.textContent = text
      
      // 触发input事件
      inputElement.dispatchEvent(new Event('input', { bubbles: true }))
    }
    
    console.log(`🔍 [DEBUG] ChatGPT: 文本填充完成`)
    return true
  } catch (error) {
    console.error(`🔍 [DEBUG] ChatGPT: 填充文本时出错:`, error)
    return false
  }
}

/**
 * 点击发送按钮
 */
function clickSendButton(buttonElement: HTMLElement): boolean {
  try {
    console.log(`🔍 [DEBUG] ChatGPT: 准备点击发送按钮:`, buttonElement)
    
    // 检查按钮是否可用
    if (buttonElement.hasAttribute('disabled')) {
      console.warn(`🔍 [DEBUG] ChatGPT: 发送按钮被禁用`)
      return false
    }
    
    buttonElement.click()
    console.log(`🔍 [DEBUG] ChatGPT: 发送按钮点击完成`)
    return true
  } catch (error) {
    console.error(`🔍 [DEBUG] ChatGPT: 点击发送按钮时出错:`, error)
    return false
  }
}

// 设置消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`🔍 [DEBUG] ChatGPT content script收到消息:`, request)
  console.log(`🔍 [DEBUG] ChatGPT 消息动作:`, request.action)
  console.log(`🔍 [DEBUG] ChatGPT 消息文本:`, request.text)
  console.log(`🔍 [DEBUG] ChatGPT 文本长度:`, request.text ? request.text.length : 0)
  
  if (request.action === 'autoFillAndSend' && request.text) {
    console.log(`🔍 [DEBUG] ChatGPT: 开始自动填充和发送流程`)
    console.log(`🔍 [DEBUG] ChatGPT: 接收到的完整消息:`, request)
    console.log(`🔍 [DEBUG] ChatGPT: 要填充的文本内容:`, request.text)
    console.log(`🔍 [DEBUG] ChatGPT: 文本长度:`, request.text ? request.text.length : 0)
    
    findInputElement(INPUT_SELECTORS, true).then(inputElement => {
      if (inputElement) {
        console.log(`🔍 [DEBUG] ChatGPT: 找到输入框，准备填充文本:`, request.text)
        const fillSuccess = fillText(inputElement, request.text)
        console.log(`🔍 [DEBUG] ChatGPT: 填充结果:`, fillSuccess)
        if (fillSuccess) {
          console.log(`🔍 [DEBUG] ChatGPT: 文本填充成功，等待1秒后发送`)
          // 等待一小段时间后发送
          setTimeout(() => {
            findSendButton(SUBMIT_SELECTORS, true).then(buttonElement => {
              if (buttonElement) {
                console.log(`🔍 [DEBUG] ChatGPT: 找到发送按钮，准备发送`)
                const sendSuccess = clickSendButton(buttonElement)
                console.log(`🔍 [DEBUG] ChatGPT: 发送结果:`, sendSuccess)
                sendResponse({ 
                  success: fillSuccess && sendSuccess, 
                  message: fillSuccess && sendSuccess ? '填充并发送成功' : '操作失败' 
                })
              } else {
                console.error(`🔍 [DEBUG] ChatGPT: 未找到发送按钮`)
                sendResponse({ success: false, message: '未找到发送按钮' })
              }
            })
          }, 1000)
        } else {
          console.error(`🔍 [DEBUG] ChatGPT: 文本填充失败`)
          sendResponse({ success: false, message: '文本填充失败' })
        }
      } else {
        console.error(`🔍 [DEBUG] ChatGPT: 未找到输入框`)
        sendResponse({ success: false, message: '未找到输入框' })
      }
    })
    return true
  }
})

console.log('ChatGPT content script已加载')