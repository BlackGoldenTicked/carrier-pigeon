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
  // 最新版文心一言发送按钮 - 2024年最新结构
  'span.sendInner__xCktUkDO.sendBtnLottie__CGcl6VqG',
  'span.sendInner__xCktUkDO',
  'span.sendBtnLottie__CGcl6VqG',
  // 包含特定SVG的发送按钮
  'span.sendInner__xCktUkDO:has(svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 100 100"])',
  'span.sendBtnLottie__CGcl6VqG:has(svg[preserveAspectRatio="xMidYMid meet"])',
  'span:has(svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 100 100"][preserveAspectRatio="xMidYMid meet"])',
  // 传统版本文心一言发送按钮
  'div.send__oauXtNY3',
  'div.btnContainer__TRj9p0ui',
  // 包含Lottie动画的发送按钮
  'div.send__oauXtNY3 div.btnContainer__TRj9p0ui',
  'div.btnContainer__TRj9p0ui span.sendInner__xCktUkDO',
  // 更广泛的类名模式匹配
  'div[class*="send"]',
  'span[class*="send"]',
  'div[class*="btn"][class*="container"]',
  'span[class*="btn"][class*="inner"]',
  'div[class*="submit"]',
  'span[class*="submit"]',
  // SVG相关选择器
  'div:has(svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 100 100"])',
  'span:has(svg[preserveAspectRatio="xMidYMid meet"])',
  'div:has(svg[viewBox="0 0 100 100"])',
  'span:has(svg[viewBox="0 0 100 100"])',
  // 通用发送按钮模式
  '*[class*="send"][class*="btn"]',
  '*[class*="send"][class*="button"]',
  '*[class*="submit"][class*="btn"]',
  '*[class*="submit"][class*="button"]',
  // 可点击元素模式
  'div[onclick*="send"]',
  'span[onclick*="send"]',
  'div[onclick*="submit"]',
  'span[onclick*="submit"]',
  // 传统选择器（保持兼容性）
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
/**
 * 强制注入文本到富文本编辑器
 * @param element 目标元素
 * @param text 要注入的文本
 * @returns 是否成功
 */
function forceInjectText(element: HTMLElement, text: string): boolean {
  console.log('🔧 [DEBUG] 文心一言: 开始强制注入文本')
  
  try {
    // 方法1: 使用Selection API
    console.log('🔧 [DEBUG] 文心一言: 尝试方法1 - Selection API')
    element.focus()
    const selection = window.getSelection()
    if (selection) {
      selection.selectAllChildren(element)
      selection.deleteFromDocument()
      const textNode = document.createTextNode(text)
      selection.getRangeAt(0).insertNode(textNode)
      selection.collapseToEnd()
      element.dispatchEvent(new Event('input', { bubbles: true }))
      console.log('✅ [DEBUG] 文心一言: 方法1成功')
      return true
    }
  } catch (e) {
    console.log('❌ [DEBUG] 文心一言: 方法1失败:', e)
  }
  
  try {
    // 方法2: 直接操作DOM
    console.log('🔧 [DEBUG] 文心一言: 尝试方法2 - 直接DOM操作')
    element.focus()
    element.innerHTML = ''
    const textNode = document.createTextNode(text)
    element.appendChild(textNode)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    console.log('✅ [DEBUG] 文心一言: 方法2成功')
    return true
  } catch (e) {
    console.log('❌ [DEBUG] 文心一言: 方法2失败:', e)
  }
  
  try {
    // 方法3: 模拟粘贴操作
    console.log('🔧 [DEBUG] 文心一言: 尝试方法3 - 模拟粘贴')
    element.focus()
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/plain', text)
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: clipboardData,
      bubbles: true,
      cancelable: true
    })
    element.dispatchEvent(pasteEvent)
    console.log('✅ [DEBUG] 文心一言: 方法3成功')
    return true
  } catch (e) {
    console.log('❌ [DEBUG] 文心一言: 方法3失败:', e)
  }
  
  console.log('❌ [ERROR] 文心一言: 所有强制注入方法都失败了')
  return false
}

/**
 * 处理文本填充
 * @param text 要填充的文本
 * @param autoSend 是否自动发送
 * @returns 操作结果
 */
async function handleFillText(text: string, autoSend: boolean = false) {
  try {
    console.log(`🚀 [DEBUG] 文心一言: 开始填充文本: "${text}", 自动发送: ${autoSend}`)
    
    const inputElement = await waitForElement(INPUT_SELECTORS, 5000)
    if (!inputElement) {
      throw new Error('未找到输入框')
    }
    
    console.log(`🎯 [DEBUG] 文心一言: 找到输入框: ${inputElement.tagName}, 类名: ${inputElement.className}`)
    
    let success = false
    
    // 处理TEXTAREA元素
    if (inputElement.tagName === 'TEXTAREA') {
      console.log('🔧 [DEBUG] 文心一言: 处理TEXTAREA元素')
      const input = inputElement as HTMLTextAreaElement
      input.focus()
      await new Promise(resolve => setTimeout(resolve, 100))
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      success = input.value === text
      console.log(`📝 [DEBUG] 文心一言: TEXTAREA注入${success ? '成功' : '失败'}, 当前值: "${input.value}"`)
    }
    // 处理contenteditable元素
    else if (inputElement.hasAttribute('contenteditable')) {
      console.log('🔧 [DEBUG] 文心一言: 处理contenteditable元素')
      const input = inputElement as HTMLElement
      input.focus()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 方法1: 模拟用户输入
      try {
        console.log('🔧 [DEBUG] 文心一言: 尝试方法1 - 模拟用户输入')
        input.textContent = ''
        const inputEvent = new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: text,
          bubbles: true,
          cancelable: true
        })
        input.dispatchEvent(inputEvent)
        input.textContent = text
        input.dispatchEvent(new Event('input', { bubbles: true }))
        success = (input.textContent || '').includes(text)
           console.log(`📝 [DEBUG] 文心一言: 方法1${success ? '成功' : '失败'}`)
       } catch (e) {
         console.log('❌ [DEBUG] 文心一言: 方法1失败:', e)
       }
       
       // 方法2: InputEvent
       if (!success) {
         try {
           console.log('🔧 [DEBUG] 文心一言: 尝试方法2 - InputEvent')
           input.focus()
           input.textContent = text
           const inputEvent = new InputEvent('input', {
             inputType: 'insertText',
             data: text,
             bubbles: true
           })
           input.dispatchEvent(inputEvent)
           input.dispatchEvent(new Event('change', { bubbles: true }))
           success = (input.textContent || '').includes(text)
           console.log(`📝 [DEBUG] 文心一言: 方法2${success ? '成功' : '失败'}`)
         } catch (e) {
           console.log('❌ [DEBUG] 文心一言: 方法2失败:', e)
         }
       }
       
       // 方法3: 直接设置内容并触发事件
       if (!success) {
         try {
           console.log('🔧 [DEBUG] 文心一言: 尝试方法3 - 直接设置内容')
           input.focus()
           input.textContent = text
           input.dispatchEvent(new Event('input', { bubbles: true }))
           input.dispatchEvent(new Event('change', { bubbles: true }))
           input.dispatchEvent(new Event('keyup', { bubbles: true }))
           success = (input.textContent || '').includes(text)
          console.log(`📝 [DEBUG] 文心一言: 方法3${success ? '成功' : '失败'}`)
        } catch (e) {
          console.log('❌ [DEBUG] 文心一言: 方法3失败:', e)
        }
      }
      
      // 方法4: 模拟键盘输入
      if (!success) {
        try {
          console.log('🔧 [DEBUG] 文心一言: 尝试方法4 - 模拟键盘输入')
          input.focus()
          input.textContent = ''
          
          // 模拟按键事件
          const keydownEvent = new KeyboardEvent('keydown', {
            key: 'a',
            code: 'KeyA',
            bubbles: true
          })
          const keyupEvent = new KeyboardEvent('keyup', {
            key: 'a',
            code: 'KeyA',
            bubbles: true
          })
          
          input.dispatchEvent(keydownEvent)
          input.textContent = text
          input.dispatchEvent(keyupEvent)
           input.dispatchEvent(new Event('input', { bubbles: true }))
           success = (input.textContent || '').includes(text)
          console.log(`📝 [DEBUG] 文心一言: 方法4${success ? '成功' : '失败'}`)
        } catch (e) {
          console.log('❌ [DEBUG] 文心一言: 方法4失败:', e)
        }
      }
      
      // 强制注入方法
      if (!success) {
        console.log('🔧 [DEBUG] 文心一言: 尝试强制注入方法')
        success = forceInjectText(input, text)
      }
      
      // 最后尝试innerHTML
      if (!success) {
        try {
          console.log('🔧 [DEBUG] 文心一言: 尝试innerHTML设置')
          input.focus()
          input.innerHTML = text
          input.dispatchEvent(new Event('input', { bubbles: true }))
          success = (input.textContent || '').includes(text) || input.innerHTML.includes(text)
          console.log(`📝 [DEBUG] 文心一言: innerHTML${success ? '成功' : '失败'}`)
        } catch (e) {
          console.log('❌ [DEBUG] 文心一言: innerHTML失败:', e)
        }
      }
      
      // 验证文本注入
      const currentText = input.textContent || input.innerHTML || ''
      console.log(`🔍 [DEBUG] 文心一言: 注入后的文本内容: "${currentText}"`)
      console.log(`🔍 [DEBUG] 文心一言: 目标文本: "${text}"`)
      console.log(`🔍 [DEBUG] 文心一言: 文本匹配: ${currentText.includes(text)}`)
      
      if (!success) {
        console.log('⚠️ [WARNING] 文心一言: 所有注入方法都失败了，但继续执行')
      }
    }
    // 处理其他输入元素
    else {
      console.log('🔧 [DEBUG] 文心一言: 处理其他输入元素')
      const input = inputElement as HTMLInputElement | HTMLTextAreaElement
      input.focus()
      await new Promise(resolve => setTimeout(resolve, 100))
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      success = input.value === text
      console.log(`📝 [DEBUG] 文心一言: 其他元素注入${success ? '成功' : '失败'}, 当前值: "${input.value}"`)
    }
    
    console.log('✅ [DEBUG] 文心一言: 文本填充完成')
    
    if (autoSend) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return await handleAutoSend()
    }
    
    return { success: true, message: '文本填充完成' }
  } catch (error) {
    console.error('❌ [ERROR] 文心一言: 填充文本失败:', error)
    throw error
  }
}

/**
 * 强制点击发送按钮（多种方法）
 * @param button 发送按钮元素
 * @returns 是否成功
 */
function forceClickSendButton(button: HTMLElement): boolean {
  console.log('🔧 [DEBUG] 文心一言: 开始强制点击发送按钮')
  
  const methods = [
    {
      name: '标准点击',
      fn: () => {
        button.click()
        return true
      }
    },
    {
      name: '鼠标事件模拟',
      fn: () => {
        const mouseEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        })
        button.dispatchEvent(mouseEvent)
        return true
      }
    },
    {
      name: '指针事件模拟',
      fn: () => {
        const pointerEvent = new PointerEvent('click', {
          bubbles: true,
          cancelable: true
        })
        button.dispatchEvent(pointerEvent)
        return true
      }
    },
    {
      name: '触摸事件模拟',
      fn: () => {
        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true
        })
        button.dispatchEvent(touchEvent)
        
        const touchEndEvent = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true
        })
        button.dispatchEvent(touchEndEvent)
        return true
      }
    },
    {
      name: '键盘事件模拟',
      fn: () => {
        button.focus()
        const keyEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true
        })
        button.dispatchEvent(keyEvent)
        
        const keyUpEvent = new KeyboardEvent('keyup', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true
        })
        button.dispatchEvent(keyUpEvent)
        return true
      }
    }
  ]
  
  for (const method of methods) {
    try {
      console.log(`🔧 [DEBUG] 文心一言: 尝试${method.name}`)
      method.fn()
      console.log(`✅ [DEBUG] 文心一言: ${method.name}执行成功`)
      return true
    } catch (e) {
      console.log(`❌ [DEBUG] 文心一言: ${method.name}失败:`, e)
    }
  }
  
  console.log('❌ [ERROR] 文心一言: 所有点击方法都失败了')
  return false
}

/**
 * 调试函数：分析页面上所有可能的发送按钮
 * @returns 调试信息
 */
function debugAllPossibleSendButtons(): void {
  console.log('🔍 [DEBUG] 文心一言: 开始全面分析页面按钮')
  
  // 1. 查找所有可能的按钮元素
  const allButtons = document.querySelectorAll('button, div[role="button"], span[role="button"], div[onclick], span[onclick]')
  console.log(`🔍 [DEBUG] 文心一言: 找到 ${allButtons.length} 个可能的按钮元素`)
  
  // 2. 查找包含发送相关关键词的元素
  const sendKeywords = ['send', '发送', 'submit', '提交']
  const elementsWithSendKeywords: Element[] = []
  
  sendKeywords.forEach(keyword => {
    const elements = document.querySelectorAll(`*[class*="${keyword}"], *[id*="${keyword}"], *[aria-label*="${keyword}"]`)
    elements.forEach(el => {
      if (!elementsWithSendKeywords.includes(el)) {
        elementsWithSendKeywords.push(el)
      }
    })
  })
  
  console.log(`🔍 [DEBUG] 文心一言: 找到 ${elementsWithSendKeywords.length} 个包含发送关键词的元素`)
  
  // 3. 查找所有SVG元素
  const allSvgs = document.querySelectorAll('svg')
  console.log(`🔍 [DEBUG] 文心一言: 找到 ${allSvgs.length} 个SVG元素`)
  
  // 4. 详细分析前10个最可能的按钮
  const candidateButtons = [...allButtons, ...elementsWithSendKeywords].slice(0, 10)
  candidateButtons.forEach((button, index) => {
    console.log(`🔍 [DEBUG] 文心一言: 候选按钮 ${index + 1}:`, {
      tagName: button.tagName,
      className: button.className,
      id: button.id,
      textContent: button.textContent?.trim().substring(0, 50),
      ariaLabel: button.getAttribute('aria-label'),
      role: button.getAttribute('role'),
      onclick: button.getAttribute('onclick'),
      visible: isElementVisible(button),
      boundingRect: button.getBoundingClientRect()
    })
  })
  
  // 5. 分析所有类名包含特定模式的元素
  const classPatterns = ['send', 'btn', 'button', 'submit', 'icon', 'lottie']
  classPatterns.forEach(pattern => {
    const elements = document.querySelectorAll(`*[class*="${pattern}"]`)
    if (elements.length > 0) {
      console.log(`🔍 [DEBUG] 文心一言: 类名包含 "${pattern}" 的元素: ${elements.length} 个`)
      elements.forEach((el, i) => {
        if (i < 3) { // 只显示前3个
          console.log(`  - ${el.tagName}.${el.className}`)
        }
      })
    }
  })
}

/**
 * 验证是否为有效的文心一言发送按钮
 * @param element - 要验证的元素
 * @returns 是否为有效的发送按钮
 */
function isValidWenxinSendButton(element: Element): boolean {
  const className = element.className || ''
  const textContent = element.textContent?.trim() || ''
  const ariaLabel = element.getAttribute('aria-label') || ''
  
  // 1. 检查文心一言特定的类名（最新版本优先）
  if (className.includes('sendInner__xCktUkDO') && className.includes('sendBtnLottie__CGcl6VqG')) {
    console.log('🔍 [DEBUG] 文心一言: 找到最新版发送按钮（双类名）')
    return true
  }
  
  if (className.includes('sendInner__xCktUkDO') || 
      className.includes('sendBtnLottie__CGcl6VqG') ||
      className.includes('send__oauXtNY3') || 
      className.includes('btnContainer__TRj9p0ui')) {
    console.log('🔍 [DEBUG] 文心一言: 找到文心一言特定按钮类名')
    return true
  }
  
  // 2. 检查通用发送相关的类名模式
  const sendPatterns = ['send', 'submit', '发送', '提交']
  const btnPatterns = ['btn', 'button', 'click']
  
  const hasSendPattern = sendPatterns.some(pattern => 
    className.toLowerCase().includes(pattern.toLowerCase()) ||
    textContent.toLowerCase().includes(pattern.toLowerCase()) ||
    ariaLabel.toLowerCase().includes(pattern.toLowerCase())
  )
  
  const hasBtnPattern = btnPatterns.some(pattern => 
    className.toLowerCase().includes(pattern.toLowerCase())
  )
  
  if (hasSendPattern && (hasBtnPattern || element.tagName === 'BUTTON')) {
    console.log('🔍 [DEBUG] 文心一言: 找到通用发送按钮模式')
    return true
  }
  
  // 3. 检查是否包含最新版Lottie SVG动画
  const svgElement = element.querySelector('svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 100 100"]') || 
                     element.querySelector('svg[viewBox="0 0 100 100"]') ||
                     element.querySelector('svg')
  if (svgElement) {
    // 检查最新版Lottie动画特征
    const hasLottieFeatures = svgElement.querySelector('defs clipPath[id*="__lottie_element"]') || 
                             svgElement.querySelector('g[id*="__lottie_element"]') ||
                             svgElement.querySelector('linearGradient[id*="__lottie_element"]') ||
                             svgElement.querySelector('mask[id*="__lottie_element"]') ||
                             svgElement.querySelector('defs clipPath') || 
                             svgElement.querySelector('g[clip-path]') ||
                             svgElement.querySelector('defs') ||
                             svgElement.querySelector('g')
    
    // 检查特定的preserveAspectRatio属性
    const preserveAspectRatio = svgElement.getAttribute('preserveAspectRatio')
    const hasCorrectAspectRatio = preserveAspectRatio === 'xMidYMid meet'
    
    // 检查SVG命名空间
    const hasCorrectNamespace = svgElement.getAttribute('xmlns') === 'http://www.w3.org/2000/svg'
    const hasXlinkNamespace = svgElement.getAttribute('xmlns:xlink') === 'http://www.w3.org/1999/xlink'
    
    if (hasLottieFeatures || (hasCorrectAspectRatio && hasCorrectNamespace)) {
      console.log('🔍 [DEBUG] 文心一言: 找到Lottie SVG动画元素', {
        hasLottieFeatures,
        hasCorrectAspectRatio,
        hasCorrectNamespace,
        hasXlinkNamespace
      })
      return true
    }
  }
  
  // 5. 检查元素位置和大小（发送按钮通常在右下角且有一定大小）
  const rect = element.getBoundingClientRect()
  const isReasonableSize = rect.width > 20 && rect.height > 20 && rect.width < 200 && rect.height < 200
  const isInRightArea = rect.right > window.innerWidth * 0.7 // 在页面右侧70%以后
  
  if (isReasonableSize && isInRightArea && (hasSendPattern || svgElement)) {
    console.log('🔍 [DEBUG] 文心一言: 根据位置和大小判断为发送按钮')
    return true
  }
  
  // 6. 检查onclick事件
  const onclick = element.getAttribute('onclick') || ''
  if (onclick && sendPatterns.some(pattern => onclick.toLowerCase().includes(pattern.toLowerCase()))) {
    console.log('🔍 [DEBUG] 文心一言: 找到包含发送事件的元素')
    return true
  }
  
  return false
}

/**
 * 点击文心一言发送按钮的多种策略
 * @param button - 发送按钮元素
 * @returns 是否点击成功
 */
function clickWenxinSendButton(button: Element): boolean {
  const element = button as HTMLElement
  
  console.log('🔍 [DEBUG] 文心一言: 开始智能点击策略', {
    tagName: element.tagName,
    className: element.className,
    id: element.id
  })
  
  try {
    // 方法1: 针对最新版按钮结构 - 点击span.sendInner__xCktUkDO.sendBtnLottie__CGcl6VqG
    if (element.classList.contains('sendInner__xCktUkDO') && element.classList.contains('sendBtnLottie__CGcl6VqG')) {
      console.log('🔍 [DEBUG] 文心一言: 方法1 - 点击最新版发送按钮')
      element.click()
      return true
    }
  } catch (error) {
    console.log('🔍 [DEBUG] 文心一言: 方法1失败，尝试方法2')
  }
  
  try {
    // 方法2: 查找并点击最新版按钮结构
    const latestButton = element.querySelector('.sendInner__xCktUkDO.sendBtnLottie__CGcl6VqG') ||
                        element.closest('.sendInner__xCktUkDO.sendBtnLottie__CGcl6VqG')
    if (latestButton) {
      console.log('🔍 [DEBUG] 文心一言: 方法2 - 点击查找到的最新版按钮')
      ;(latestButton as HTMLElement).click()
      return true
    }
  } catch (error) {
    console.log('🔍 [DEBUG] 文心一言: 方法2失败，尝试方法3')
  }
  
  try {
    // 方法3: 点击包含SVG的元素
    const svgContainer = element.querySelector('svg[xmlns="http://www.w3.org/2000/svg"][viewBox="0 0 100 100"]')?.parentElement
    if (svgContainer && svgContainer !== element) {
      console.log('🔍 [DEBUG] 文心一言: 方法3 - 点击SVG容器')
      ;(svgContainer as HTMLElement).click()
      return true
    }
  } catch (error) {
    console.log('🔍 [DEBUG] 文心一言: 方法3失败，尝试方法4')
  }
  
  try {
    // 方法4: 直接点击最外层容器
    console.log('🔍 [DEBUG] 文心一言: 方法4 - 点击最外层容器')
    element.click()
    return true
  } catch (error) {
    console.log('🔍 [DEBUG] 文心一言: 方法4失败，尝试方法5')
  }
  
  try {
    // 方法5: 点击内部的btnContainer（传统版本）
    console.log('🔍 [DEBUG] 文心一言: 方法5 - 点击btnContainer')
    const btnContainer = element.querySelector('.btnContainer__TRj9p0ui') || 
                         element.closest('.btnContainer__TRj9p0ui')
    if (btnContainer) {
      (btnContainer as HTMLElement).click()
      return true
    }
  } catch (error) {
    console.log('🔍 [DEBUG] 文心一言: 方法5失败，尝试方法6')
  }
  
  try {
    // 方法6: 点击sendInner元素（传统版本）
    console.log('🔍 [DEBUG] 文心一言: 方法6 - 点击sendInner')
    const sendInner = element.querySelector('.sendInner__xCktUkDO') ||
                     element.closest('.sendInner__xCktUkDO')
    if (sendInner) {
      (sendInner as HTMLElement).click()
      return true
    }
  } catch (error) {
    console.log('🔍 [DEBUG] 文心一言: 方法6失败，尝试方法7')
  }
  
  try {
    // 方法7: 模拟鼠标事件
    console.log('🔍 [DEBUG] 文心一言: 方法7 - 模拟鼠标事件')
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    })
    element.dispatchEvent(clickEvent)
    return true
  } catch (error) {
    console.log('🔍 [DEBUG] 文心一言: 方法7失败')
  }
  
  return false
}

/**
 * 处理自动发送
 * @returns 操作结果
 */
async function handleAutoSend() {
  try {
    console.log('🚀 [DEBUG] 文心一言: 开始自动发送')
    
    // 首先进行全面的页面分析
    debugAllPossibleSendButtons()
    
    // 等待一下确保文本已经填充完成
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 扩展搜索范围，查找发送按钮
    let sendButton: Element | null = null
    let foundSelector = ''
    
    // 首先尝试精确匹配文心一言的新按钮结构
    for (const selector of SUBMIT_SELECTORS) {
      const elements = document.querySelectorAll(selector)
      for (const element of elements) {
        if (isElementVisible(element) && isValidWenxinSendButton(element)) {
          sendButton = element
          foundSelector = selector
          console.log(`✅ [DEBUG] 文心一言: 找到有效发送按钮: ${selector}`)
          break
        }
      }
      if (sendButton) break
    }
    
    // 如果没找到，尝试更广泛的搜索
    if (!sendButton) {
      console.log('🔍 [DEBUG] 文心一言: 精确匹配失败，尝试广泛搜索')
      const allClickableElements = document.querySelectorAll('div, span, button')
      for (const element of allClickableElements) {
        if (isElementVisible(element) && isValidWenxinSendButton(element)) {
          sendButton = element
          foundSelector = '广泛搜索'
          console.log(`✅ [DEBUG] 文心一言: 通过广泛搜索找到发送按钮`)
          break
        }
      }
    }
    
    if (!sendButton) {
      throw new Error('未找到发送按钮')
    }
    
    console.log(`🎯 [DEBUG] 文心一言: 找到发送按钮: ${sendButton.tagName}, 类名: ${sendButton.className}`)
    
    // 检查按钮状态
    const button = sendButton as HTMLButtonElement
    console.log('🔍 [DEBUG] 文心一言: 发送按钮属性:', {
      disabled: button.disabled,
      className: button.className,
      textContent: button.textContent?.trim(),
      ariaLabel: button.getAttribute('aria-label'),
      title: button.title,
      visible: isElementVisible(button)
    })
    
    if (button.disabled) {
      console.log('⚠️ [WARNING] 文心一言: 发送按钮被禁用，尝试强制点击')
    }
    
    if (!isElementVisible(button)) {
      console.log('⚠️ [WARNING] 文心一言: 发送按钮不可见，尝试强制点击')
    }
    
    // 使用专门的点击策略
    console.log(`🔍 [DEBUG] 文心一言: 尝试点击发送按钮 (选择器: ${foundSelector})`)
    const clickSuccess = clickWenxinSendButton(sendButton)
    
    // 如果专门策略失败，尝试强制点击
    let success = clickSuccess
    if (!success) {
      console.log('🔧 [DEBUG] 文心一言: 专门策略失败，尝试强制点击方法')
      success = forceClickSendButton(button)
    }
    
    // 最后尝试通过表单提交
    if (!success) {
      try {
        console.log('🔧 [DEBUG] 文心一言: 尝试表单提交')
        const form = button.closest('form')
        if (form) {
          form.submit()
          console.log('✅ [DEBUG] 文心一言: 表单提交成功')
          success = true
        } else {
          console.log('❌ [DEBUG] 文心一言: 未找到表单元素')
        }
      } catch (e) {
        console.log('❌ [DEBUG] 文心一言: 表单提交失败:', e)
      }
    }
    
    if (success) {
      console.log('✅ [DEBUG] 文心一言: 自动发送完成')
      return { success: true, message: '自动发送成功' }
    } else {
      console.log('❌ [ERROR] 文心一言: 所有发送方法都失败了')
      return { success: false, message: '自动发送失败' }
    }
    
  } catch (error) {
    console.error('❌ [ERROR] 文心一言: 自动发送失败:', error)
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