/**
 * 基础内容脚本模块
 * 提供通用的功能函数
 */

/**
 * 检查元素是否可见
 * @param {HTMLElement} element 要检查的元素
 * @returns {boolean} 元素是否可见
 */
export function isElementVisible(element: HTMLElement): boolean {
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
 * @param {string} selector 元素选择器
 * @param {number} timeout 超时时间（毫秒）
 * @param {number} interval 检查间隔（毫秒）
 * @returns {Promise<HTMLElement | null>} 找到的元素或null
 */
export function waitForElement(
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
 * 查找输入框元素
 * @param {string[]} selectors 选择器数组
 * @param {boolean} waitForElement 是否等待元素出现
 * @returns {Promise<HTMLElement | null>} 找到的输入框元素
 */
export async function findInputElement(
  selectors: string[],
  shouldWait: boolean = false
): Promise<HTMLElement | null> {
  for (const selector of selectors) {
    if (shouldWait) {
      const element = await waitForElement(selector)
      if (element) return element
    } else {
      const element = document.querySelector(selector) as HTMLElement
      if (element && isElementVisible(element)) {
        return element
      }
    }
  }
  return null
}

/**
 * 查找发送按钮元素
 * @param {string[]} selectors 选择器数组
 * @param {boolean} waitForElement 是否等待元素出现
 * @returns {Promise<HTMLElement | null>} 找到的按钮元素
 */
export async function findSendButton(
  selectors: string[],
  shouldWait: boolean = false
): Promise<HTMLElement | null> {
  for (const selector of selectors) {
    if (shouldWait) {
      const element = await waitForElement(selector)
      if (element) return element
    } else {
      const element = document.querySelector(selector) as HTMLElement
      if (element && isElementVisible(element) && !(element as HTMLButtonElement).disabled) {
        return element
      }
    }
  }
  return null
}

/**
 * 自动填充文本到输入框
 * @param {HTMLElement} inputElement 输入框元素
 * @param {string} text 要填充的文本
 * @returns {boolean} 是否填充成功
 */
export function fillText(inputElement: HTMLElement, text: string): boolean {
  try {
    // 聚焦输入框
    inputElement.focus()
    
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      // 对于textarea和input元素
      const textElement = inputElement as HTMLTextAreaElement | HTMLInputElement
      textElement.value = text
      
      // 触发input事件
      const inputEvent = new Event('input', { bubbles: true })
      textElement.dispatchEvent(inputEvent)
      
      // 触发change事件
      const changeEvent = new Event('change', { bubbles: true })
      textElement.dispatchEvent(changeEvent)
    } else if (inputElement.getAttribute('contenteditable') === 'true') {
      // 对于contenteditable元素
      inputElement.textContent = text
      
      // 触发input事件
      const inputEvent = new Event('input', { bubbles: true })
      inputElement.dispatchEvent(inputEvent)
    }
    
    console.log('文本填充成功:', text.substring(0, 50) + '...')
    return true
  } catch (error) {
    console.error('文本填充失败:', error)
    return false
  }
}

/**
 * 点击发送按钮
 * @param {HTMLElement} buttonElement 按钮元素
 * @returns {boolean} 是否点击成功
 */
export function clickSendButton(buttonElement: HTMLElement): boolean {
  try {
    // 检查按钮是否可用
    if ((buttonElement as HTMLButtonElement).disabled) {
      console.warn('发送按钮已禁用')
      return false
    }
    
    // 模拟点击事件
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    })
    
    buttonElement.dispatchEvent(clickEvent)
    console.log('发送按钮点击成功')
    return true
  } catch (error) {
    console.error('发送按钮点击失败:', error)
    return false
  }
}

/**
 * 获取页面调试信息
 * @param {string} modelType 模型类型
 * @param {string[]} inputSelectors 输入框选择器
 * @param {string[]} submitSelectors 发送按钮选择器
 * @returns {Object} 调试信息
 */
export function getDebugInfo(
  modelType: string,
  inputSelectors: string[],
  submitSelectors: string[]
) {
  const inputElements: Array<{
    selector: string;
    index: number;
    tagName: string;
    type: string | null;
    placeholder: string | null;
    id: string;
    className: string;
    visible: boolean;
    contentEditable: string | null;
  }> = []
  
  const submitElements: Array<{
    selector: string;
    index: number;
    tagName: string;
    type: string | null;
    ariaLabel: string | null;
    title: string | null;
    id: string;
    className: string;
    visible: boolean;
    disabled: boolean;
    textContent: string | undefined;
  }> = []
  
  // 查找输入框元素
  for (const selector of inputSelectors) {
    const elements = document.querySelectorAll(selector)
    elements.forEach((el, index) => {
      inputElements.push({
        selector,
        index,
        tagName: el.tagName,
        type: el.getAttribute('type'),
        placeholder: el.getAttribute('placeholder'),
        id: el.id,
        className: el.className,
        visible: isElementVisible(el as HTMLElement),
        contentEditable: el.getAttribute('contenteditable')
      })
    })
  }
  
  // 查找发送按钮元素
  for (const selector of submitSelectors) {
    const elements = document.querySelectorAll(selector)
    elements.forEach((el, index) => {
      submitElements.push({
        selector,
        index,
        tagName: el.tagName,
        type: el.getAttribute('type'),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        id: el.id,
        className: el.className,
        visible: isElementVisible(el as HTMLElement),
        disabled: (el as HTMLButtonElement).disabled,
        textContent: el.textContent?.trim()
      })
    })
  }
  
  return {
    modelType,
    url: window.location.href,
    inputElements,
    submitElements,
    timestamp: new Date().toISOString()
  }
}

/**
 * 设置消息监听器
 * @param {string} modelType 模型类型
 * @param {string[]} inputSelectors 输入框选择器
 * @param {string[]} submitSelectors 发送按钮选择器
 * @param {boolean} waitForElement 是否等待元素出现
 */
export function setupMessageListener(
  modelType: string,
  inputSelectors: string[],
  submitSelectors: string[],
  shouldWait: boolean = true
) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`🔍 [DEBUG] ${modelType} content script收到消息:`, request)
    console.log(`🔍 [DEBUG] ${modelType} 消息动作:`, request.action)
    console.log(`🔍 [DEBUG] ${modelType} 消息文本:`, request.text)
    console.log(`🔍 [DEBUG] ${modelType} 文本长度:`, request.text ? request.text.length : 0)
    
    if (request.action === 'autoFill' && request.text) {
      console.log(`🔍 [DEBUG] ${modelType}: 开始自动填充流程`)
      findInputElement(inputSelectors, shouldWait).then(inputElement => {
        if (inputElement) {
          console.log(`🔍 [DEBUG] ${modelType}: 找到输入框，准备填充文本:`, request.text)
          const success = fillText(inputElement, request.text)
          console.log(`🔍 [DEBUG] ${modelType}: 填充结果:`, success)
          sendResponse({ success, message: success ? '文本填充成功' : '文本填充失败' })
        } else {
          console.error(`🔍 [DEBUG] ${modelType}: 未找到输入框`)
          sendResponse({ success: false, message: '未找到输入框' })
        }
      })
      return true
    }
    
    if (request.action === 'autoSend') {
      console.log(`🔍 [DEBUG] ${modelType}: 开始自动发送流程`)
      findSendButton(submitSelectors, shouldWait).then(buttonElement => {
        if (buttonElement) {
          console.log(`🔍 [DEBUG] ${modelType}: 找到发送按钮，准备发送`)
          const success = clickSendButton(buttonElement)
          console.log(`🔍 [DEBUG] ${modelType}: 发送结果:`, success)
          sendResponse({ success, message: success ? '消息发送成功' : '消息发送失败' })
        } else {
          console.error(`🔍 [DEBUG] ${modelType}: 未找到发送按钮`)
          sendResponse({ success: false, message: '未找到发送按钮' })
        }
      })
      return true
    }
    
    if (request.action === 'autoFillAndSend' && request.text) {
      console.log(`🔍 [DEBUG] ${modelType}: 开始自动填充和发送流程`)
      console.log(`🔍 [DEBUG] ${modelType}: 接收到的完整消息:`, request)
      console.log(`🔍 [DEBUG] ${modelType}: 要填充的文本内容:`, request.text)
      console.log(`🔍 [DEBUG] ${modelType}: 文本长度:`, request.text ? request.text.length : 0)
      
      findInputElement(inputSelectors, shouldWait).then(inputElement => {
        if (inputElement) {
          console.log(`🔍 [DEBUG] ${modelType}: 找到输入框，准备填充文本:`, request.text)
          const fillSuccess = fillText(inputElement, request.text)
          console.log(`🔍 [DEBUG] ${modelType}: 填充结果:`, fillSuccess)
          if (fillSuccess) {
            console.log(`🔍 [DEBUG] ${modelType}: 文本填充成功，等待1秒后发送`)
            // 等待一小段时间后发送
            setTimeout(() => {
              findSendButton(submitSelectors, shouldWait).then(buttonElement => {
                if (buttonElement) {
                  console.log(`🔍 [DEBUG] ${modelType}: 找到发送按钮，准备发送`)
                  const sendSuccess = clickSendButton(buttonElement)
                  console.log(`🔍 [DEBUG] ${modelType}: 发送结果:`, sendSuccess)
                  sendResponse({ 
                    success: fillSuccess && sendSuccess, 
                    message: fillSuccess && sendSuccess ? '填充并发送成功' : '操作失败' 
                  })
                } else {
                  console.error(`🔍 [DEBUG] ${modelType}: 未找到发送按钮`)
                  sendResponse({ success: false, message: '未找到发送按钮' })
                }
              })
            }, 1000)
          } else {
            console.error(`🔍 [DEBUG] ${modelType}: 文本填充失败`)
            sendResponse({ success: false, message: '文本填充失败' })
          }
        } else {
          console.error(`🔍 [DEBUG] ${modelType}: 未找到输入框`)
          sendResponse({ success: false, message: '未找到输入框' })
        }
      })
      return true
    }
    
    if (request.action === 'getDebugInfo') {
      const debugInfo = getDebugInfo(modelType, inputSelectors, submitSelectors)
      console.log(`${modelType}页面调试信息:`, debugInfo)
      sendResponse({ success: true, data: debugInfo })
      return true
    }
  })
  
  console.log(`${modelType} content script已加载`)
}