/**
 * 通义千问专用内容脚本
 * 独立实现，无外部依赖
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: [
    'https://tongyi.com/*',
    'https://*.tongyi.com/*',
    'https://tongyi.aliyun.com/*', 
    'https://qianwen.aliyun.com/*',
    'https://qianwen.alibaba.com/*',
    'https://tongyi.alibaba.com/*',
    'https://*.aliyun.com/*',
    'https://*.alibaba.com/*'
  ],
  run_at: 'document_end',
  all_frames: true
}

// 通义千问选择器配置 - 简化并更新
const INPUT_SELECTORS = [
  // 最新通义千问选择器
  'textarea',
  'div[contenteditable="true"]',
  'div[role="textbox"]',
  '[data-testid*="input"]',
  '[placeholder*="问"]',
  '[placeholder*="输入"]',
  '.ant-input',
  'textarea[class*="textarea"]',
  'div[class*="textarea"]'
]

const SUBMIT_SELECTORS = [
  // 通义千问发送按钮 - 精确匹配实际HTML结构（最高优先级）
  'div.operateBtn--qMhYIdIu',
  'div[class*="operateBtn"]',
  'div[class*="operate"]:has(svg[use*="fasong"])',
  'div[class*="operate"]:has(svg)',
  
  // 通过SVG图标识别发送按钮
  'div:has(svg use[xlink\\:href*="fasong"])',
  'div:has(svg use[href*="fasong"])',
  'button:has(svg use[xlink\\:href*="fasong"])',
  'button:has(svg use[href*="fasong"])',
  
  // 右侧操作区域的按钮
  'div[class*="right"] div:has(svg):last-child',
  'div[class*="right"] div[class*="operate"]',
  'div[class*="functionArea"] div[class*="right"] div:has(svg)',
  
  // 通义千问发送按钮（飞机图标）- 排除新建按钮
  'button:has(svg):not([aria-label*="新建"]):not([title*="新建"]):not([class*="new"])',
  'div[role="button"]:has(svg):not([aria-label*="新建"]):not([title*="新建"]):not([class*="new"])',
  
  // 输入框附近的发送按钮
  'form button[type="submit"]',
  '[class*="input"] button:has(svg)',
  '[class*="chat"] button:has(svg)',
  '[class*="message"] button:has(svg)',
  
  // 通义千问特定发送按钮选择器
  'button[class*="sendBtn"]:not([class*="new"])',
  'button[class*="send-btn"]:not([class*="new"])',
  'div[class*="sendBtn"]:not([class*="new"])',
  'div[class*="send-btn"]:not([class*="new"])',
  
  // 带发送相关属性的按钮
  'button[aria-label*="发送"]',
  'button[aria-label*="send"]',
  'button[title*="发送"]',
  'button[title*="send"]',
  '[data-testid*="send"]',
  
  // 通用选择器（优先级较低）
  '[class*="send"]:not([class*="new"])',
  '[class*="submit"]:not([class*="new"])',
  'button[class*="primary"]:has(svg)',
  'div[class*="primary"]:has(svg)',
  
  // 最后的备选方案
  'button:has(svg)',
  'div[role="button"]:has(svg)',
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
            console.log(`[通义千问] 找到可见元素:`, selector, element)
            resolve(element)
            return
          }
        }
      }
      
      if (Date.now() - startTime > timeout) {
        console.log(`[通义千问] 等待元素超时:`, selectors)
        resolve(null)
        return
      }
      
      setTimeout(check, 100)
    }
    
    check()
  })
}

/**
 * 智能过滤按钮的函数
 * @param button 要检查的按钮元素
 * @returns 是否是有效的发送按钮
 */
function isValidSendButton(button: Element): boolean {
  const text = button.textContent?.trim().toLowerCase() || ''
  const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
  const title = button.getAttribute('title')?.toLowerCase() || ''
  const className = button.className.toLowerCase()
  
  // 特殊处理：通义千问的operateBtn按钮（发送按钮）
  if (className.includes('operatebtn') || className.includes('operate-btn')) {
    console.log(`🔍 [DEBUG] 通义千问: 识别为operateBtn发送按钮: "${className}"`)
    return true
  }
  
  // 检查SVG图标是否为发送图标
  const svgElement = button.querySelector('svg use')
  if (svgElement) {
    const href = svgElement.getAttribute('xlink:href') || svgElement.getAttribute('href') || ''
    if (href.includes('fasong') || href.includes('send')) {
      console.log(`🔍 [DEBUG] 通义千问: 识别为发送SVG图标: "${href}"`)
      return true
    }
  }
  
  // 排除包含这些关键词的按钮
  const excludeKeywords = ['新建', '创建', '添加', '新增', 'new', 'create', 'add', '对话', 'conversation']
  
  for (const keyword of excludeKeywords) {
    if (text.includes(keyword) || ariaLabel.includes(keyword) || title.includes(keyword) || className.includes(keyword)) {
      console.log(`🚫 [DEBUG] 通义千问: 排除按钮 - 包含关键词 "${keyword}": ${text || ariaLabel || title || className}`)
      return false
    }
  }
  
  // 优先选择包含发送相关关键词的按钮
  const sendKeywords = ['发送', 'send', '提交', 'submit', 'fasong']
  const hasSendKeyword = sendKeywords.some(keyword => 
    text.includes(keyword) || ariaLabel.includes(keyword) || title.includes(keyword)
  )
  
  if (hasSendKeyword) {
    console.log(`✅ [DEBUG] 通义千问: 发现发送按钮 - 包含发送关键词: ${text || ariaLabel || title}`)
    return true
  }
  
  // 检查是否包含SVG图标（可能是飞机图标）
  const hasSvg = button.querySelector('svg') !== null
  if (hasSvg) {
    console.log(`✅ [DEBUG] 通义千问: 发现图标按钮 - 包含SVG: ${className}`)
    return true
  }
  
  console.log(`⚠️ [DEBUG] 通义千问: 按钮未通过过滤: ${text || ariaLabel || title || className}`)
  return false
}

/**
 * 等待元素出现（带智能过滤）
 * @param selectors 选择器数组
 * @param timeout 超时时间（毫秒）
 * @returns 找到的元素或null
 */
function waitForElementWithFilter(selectors: string[], timeout = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    function check() {
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector)
          for (const element of elements) {
            if (isElementVisible(element) && isValidSendButton(element)) {
              console.log(`✅ [DEBUG] 通义千问: 找到有效发送按钮: ${selector}`)
              resolve(element)
              return
            }
          }
        } catch (error) {
          console.log(`⚠️ [DEBUG] 通义千问: 选择器错误 ${selector}:`, error)
        }
      }
      
      if (Date.now() - startTime > timeout) {
        console.log(`❌ [DEBUG] 通义千问: 等待有效发送按钮超时 (${timeout}ms)`)
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
  console.log('[通义千问] 设置消息监听器')
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`🔍 [DEBUG] 通义千问 content script收到消息:`, message)
    console.log(`🔍 [DEBUG] 通义千问 消息动作:`, message.action)
    console.log(`🔍 [DEBUG] 通义千问 消息文本:`, message.text)
    console.log(`🔍 [DEBUG] 通义千问 文本长度:`, message.text ? message.text.length : 0)
    
    // 支持标准的autoFillAndSend动作
    if (message.action === 'autoFillAndSend' && message.text) {
      console.log(`🔍 [DEBUG] 通义千问: 开始自动填充和发送流程`)
      handleFillAndSend(message.text)
        .then(result => {
          console.log(`🔍 [DEBUG] 通义千问: 填充并发送结果:`, result)
          sendResponse({ 
            success: result.success, 
            message: result.success ? '填充并发送成功' : '操作失败' 
          })
        })
        .catch(error => {
          console.error(`🔍 [DEBUG] 通义千问: 填充并发送错误:`, error)
          sendResponse({ success: false, message: error.message })
        })
      return true
    }
    
    if (message.action === 'fillText') {
      handleFillText(message.text, message.autoSend || false)
        .then(result => {
          console.log('[通义千问] 填充文本结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[通义千问] 填充文本错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true // 保持消息通道开放
    }
    
    if (message.action === 'autoSend') {
      handleAutoSend()
        .then(result => {
          console.log('[通义千问] 自动发送结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[通义千问] 自动发送错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    
    if (message.action === 'fillAndSend') {
      handleFillAndSend(message.text)
        .then(result => {
          console.log('[通义千问] 填充并发送结果:', result)
          sendResponse(result)
        })
        .catch(error => {
          console.error('[通义千问] 填充并发送错误:', error)
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    
    if (message.action === 'getDebugInfo') {
      const debugInfo = getDebugInfo()
      console.log('[通义千问] 调试信息:', debugInfo)
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
 * 简化的文本注入函数
 * @param input - 输入元素
 * @param text - 要注入的文本
 * @returns 是否注入成功
 */
function injectText(input: Element, text: string): boolean {
  console.log(`🔧 [DEBUG] 通义千问: 开始文本注入...`)
  
  try {
    // 聚焦元素
    if (input instanceof HTMLElement) {
      input.focus()
    }
    
    // 根据元素类型选择注入方法
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      const inputElement = input as HTMLInputElement | HTMLTextAreaElement
      inputElement.value = text
      
      // 触发事件
      inputElement.dispatchEvent(new Event('input', { bubbles: true }))
      inputElement.dispatchEvent(new Event('change', { bubbles: true }))
      
      console.log(`✅ [DEBUG] 通义千问: TEXTAREA/INPUT注入成功`)
      return inputElement.value === text
    }
    
    // contenteditable元素
    if (input.getAttribute('contenteditable') === 'true') {
      // 清空并设置新内容
      input.textContent = text
      
      // 触发事件
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      
      console.log(`✅ [DEBUG] 通义千问: contenteditable注入成功`)
      return input.textContent === text
    }
    
    console.log(`❌ [DEBUG] 通义千问: 未知元素类型`)
    return false
    
  } catch (error) {
    console.error(`❌ [DEBUG] 通义千问: 注入失败:`, error)
    return false
  }
}

async function handleFillText(text: string, autoSend: boolean = false) {
  console.log(`🔍 [DEBUG] 通义千问: 开始填充文本: "${text}"`);
  console.log(`🔍 [DEBUG] 通义千问: 自动发送: ${autoSend}`);
  
  try {
    // 先检测当前页面的所有输入元素
    console.log('🔍 [DEBUG] 通义千问: 检测当前页面输入元素...');
    const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
    console.log(`🔍 [DEBUG] 通义千问: 页面共有 ${allInputs.length} 个输入元素`);
    
    allInputs.forEach((input, index) => {
      const isVisible = isElementVisible(input);
      console.log(`  ${index + 1}. ${input.tagName} - visible: ${isVisible} - class: "${input.className}" - placeholder: "${input.getAttribute('placeholder')}"`);
    });
    
    // 逐个尝试我们的选择器
    console.log('🔍 [DEBUG] 通义千问: 尝试使用配置的选择器...');
    INPUT_SELECTORS.forEach((selector, index) => {
      const elements = document.querySelectorAll(selector);
      console.log(`  选择器 ${index + 1}: "${selector}" - 找到 ${elements.length} 个元素`);
    });
    
    // 等待输入框出现
    console.log('🔍 [DEBUG] 通义千问: 等待输入框出现...');
    const inputElement = await waitForElement(INPUT_SELECTORS, 5000);
    
    if (!inputElement) {
      console.error('❌ [DEBUG] 通义千问: 未找到输入框');
      console.log('🔍 [DEBUG] 通义千问: 尝试直接查找textarea...');
      const directTextarea = document.querySelector('textarea');
      if (directTextarea) {
        console.log('🔍 [DEBUG] 通义千问: 找到直接textarea，尝试使用');
        const injectionSuccess = injectText(directTextarea, text);
        if (injectionSuccess) {
          console.log('✅ [DEBUG] 通义千问: 直接textarea注入成功');
          if (autoSend) {
            const sendResult = await handleAutoSend();
            return {
              success: sendResult.success,
              message: sendResult.success ? '填充并发送成功' : '填充成功但发送失败'
            };
          }
          return { success: true, message: '文本填充成功' };
        }
      }
      return { success: false, error: '未找到输入框' };
    }
    
    console.log(`✅ [DEBUG] 通义千问: 找到输入框: ${inputElement.tagName} - class: "${inputElement.className}"`);
    
    // 注入文本
    const injectionSuccess = injectText(inputElement, text);
    
    if (!injectionSuccess) {
      console.error('❌ [DEBUG] 通义千问: 文本注入失败');
      return { success: false, error: '文本注入失败' };
    }
    
    console.log('✅ [DEBUG] 通义千问: 文本注入成功');
    
    // 如果需要自动发送
    if (autoSend) {
      console.log('🔍 [DEBUG] 通义千问: 开始自动发送');
      const sendResult = await handleAutoSend();
      return {
        success: sendResult.success,
        message: sendResult.success ? '填充并发送成功' : '填充成功但发送失败'
      };
    }
    
    return { success: true, message: '文本填充成功' };
    
  } catch (error) {
    console.error('❌ [DEBUG] 通义千问: 填充错误:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 处理自动发送
 */
/**
 * 简化的点击发送按钮函数
 * @param button - 发送按钮元素
 * @returns 是否点击成功
 */
function clickSendButton(button: Element): boolean {
  try {
    if (!(button instanceof HTMLElement)) {
      console.error('❌ [DEBUG] 通义千问: 按钮不是HTMLElement')
      return false
    }
    
    console.log('🔍 [DEBUG] 通义千问: 开始点击发送按钮')
    console.log(`🔍 [DEBUG] 通义千问: 按钮信息 - tag: ${button.tagName}, class: "${button.className}", text: "${button.textContent?.trim()}"`)
    
    // 方法1: 直接点击
    try {
      console.log('🔍 [DEBUG] 通义千问: 尝试方法1 - 直接点击')
      button.click()
      console.log('✅ [DEBUG] 通义千问: 方法1成功 - 直接点击完成')
      return true
    } catch (error) {
      console.log('⚠️ [DEBUG] 通义千问: 方法1失败 - 直接点击失败:', error)
    }
    
    // 方法2: 模拟鼠标点击事件
    try {
      console.log('🔍 [DEBUG] 通义千问: 尝试方法2 - 模拟鼠标点击')
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
      button.dispatchEvent(clickEvent)
      console.log('✅ [DEBUG] 通义千问: 方法2成功 - 模拟点击完成')
      return true
    } catch (error) {
      console.log('⚠️ [DEBUG] 通义千问: 方法2失败 - 模拟点击失败:', error)
    }
    
    // 方法3: 触发mousedown和mouseup事件
    try {
      console.log('🔍 [DEBUG] 通义千问: 尝试方法3 - 触发鼠标事件序列')
      const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true, cancelable: true })
      
      button.dispatchEvent(mouseDownEvent)
      button.dispatchEvent(mouseUpEvent)
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      
      console.log('✅ [DEBUG] 通义千问: 方法3成功 - 鼠标事件序列完成')
      return true
    } catch (error) {
      console.log('⚠️ [DEBUG] 通义千问: 方法3失败 - 鼠标事件序列失败:', error)
    }
    
    // 方法4: 如果是表单按钮，尝试提交表单
    try {
      console.log('🔍 [DEBUG] 通义千问: 尝试方法4 - 查找并提交表单')
      const form = button.closest('form')
      if (form) {
        console.log('🔍 [DEBUG] 通义千问: 找到表单，尝试提交')
        form.submit()
        console.log('✅ [DEBUG] 通义千问: 方法4成功 - 表单提交完成')
        return true
      } else {
        console.log('⚠️ [DEBUG] 通义千问: 方法4跳过 - 未找到表单')
      }
    } catch (error) {
      console.log('⚠️ [DEBUG] 通义千问: 方法4失败 - 表单提交失败:', error)
    }
    
    // 方法5: 尝试触发键盘事件（Enter键）
    try {
      console.log('🔍 [DEBUG] 通义千问: 尝试方法5 - 触发Enter键事件')
      button.focus()
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true
      })
      button.dispatchEvent(enterEvent)
      console.log('✅ [DEBUG] 通义千问: 方法5成功 - Enter键事件完成')
      return true
    } catch (error) {
      console.log('⚠️ [DEBUG] 通义千问: 方法5失败 - Enter键事件失败:', error)
    }
    
    // 方法6: 尝试查找并点击内部的可点击元素
    try {
      console.log('🔍 [DEBUG] 通义千问: 尝试方法6 - 查找内部可点击元素')
      const clickableChildren = button.querySelectorAll('svg, span, i, [role="button"]')
      if (clickableChildren.length > 0) {
        console.log(`🔍 [DEBUG] 通义千问: 找到 ${clickableChildren.length} 个内部元素`)
        const child = clickableChildren[0] as HTMLElement
        child.click()
        console.log('✅ [DEBUG] 通义千问: 方法6成功 - 内部元素点击完成')
        return true
      } else {
        console.log('⚠️ [DEBUG] 通义千问: 方法6跳过 - 未找到内部可点击元素')
      }
    } catch (error) {
      console.log('⚠️ [DEBUG] 通义千问: 方法6失败 - 内部元素点击失败:', error)
    }
    
    // 方法7: 尝试使用原生DOM方法
    try {
      console.log('🔍 [DEBUG] 通义千问: 尝试方法7 - 原生DOM点击')
      if ('click' in button && typeof (button as any).click === 'function') {
        (button as any).click()
        console.log('✅ [DEBUG] 通义千问: 方法7成功 - 原生DOM点击完成')
        return true
      }
    } catch (error) {
      console.log('⚠️ [DEBUG] 通义千问: 方法7失败 - 原生DOM点击失败:', error)
    }
    
    console.error('❌ [DEBUG] 通义千问: 所有点击方法都失败了')
    return false
    
  } catch (error) {
    console.error('❌ [DEBUG] 通义千问: 点击按钮过程中发生错误:', error)
    return false
  }
}

async function handleAutoSend() {
  try {
    console.log('🔍 [DEBUG] 通义千问: 开始自动发送')
    
    // 先检测当前页面的所有按钮
    console.log('🔍 [DEBUG] 通义千问: 检测当前页面按钮...')
    const allButtons = document.querySelectorAll('button, [role="button"], div[class*="btn"], div[class*="send"], div[class*="submit"]')
    console.log(`🔍 [DEBUG] 通义千问: 页面共有 ${allButtons.length} 个按钮元素`)
    
    allButtons.forEach((button, index) => {
      const text = button.textContent?.trim() || ''
      const isVisible = isElementVisible(button)
      const isDisabled = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true'
      console.log(`  ${index + 1}. ${button.tagName} - visible: ${isVisible} - disabled: ${isDisabled} - class: "${button.className}" - text: "${text.substring(0, 20)}" - aria-label: "${button.getAttribute('aria-label')}"`)
    })
    
    // 逐个尝试我们的选择器
    console.log('🔍 [DEBUG] 通义千问: 尝试使用配置的发送按钮选择器...')
    SUBMIT_SELECTORS.forEach((selector, index) => {
      const elements = document.querySelectorAll(selector)
      console.log(`  选择器 ${index + 1}: "${selector}" - 找到 ${elements.length} 个元素`)
    })
    
    // 使用智能过滤的waitForElement
    let submitButton = await waitForElementWithFilter(SUBMIT_SELECTORS, 5000)
    
    if (!submitButton) {
      console.error('❌ [DEBUG] 通义千问: 未找到发送按钮')
      
      // 尝试直接查找包含"发送"文本的按钮
      console.log('🔍 [DEBUG] 通义千问: 尝试查找包含"发送"文本的按钮...')
      const sendButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(btn => {
        const text = btn.textContent?.trim() || ''
        return text.includes('发送') || text.includes('Send') || text.includes('提交')
      })
      
      if (sendButtons.length > 0) {
        console.log(`🔍 [DEBUG] 通义千问: 找到 ${sendButtons.length} 个包含发送文本的按钮`)
        const button = sendButtons[0]
        console.log(`🔍 [DEBUG] 通义千问: 尝试点击文本按钮: "${button.textContent?.trim()}"`)
        
        const clickSuccess = clickSendButton(button)
        if (clickSuccess) {
          console.log('✅ [DEBUG] 通义千问: 文本按钮点击成功')
          return { success: true, message: '自动发送成功（文本匹配）' }
        }
      }
      
      return { success: false, error: '未找到发送按钮' }
    }
    
    console.log(`✅ [DEBUG] 通义千问: 找到发送按钮: ${submitButton.tagName} - class: "${submitButton.className}"`)
    
    // 检查按钮是否被禁用（更全面的检查）
    function isButtonDisabled(button: Element): boolean {
      return button.hasAttribute('disabled') || 
             button.getAttribute('aria-disabled') === 'true' ||
             button.classList.contains('disabled') ||
             button.classList.contains('btn-disabled') ||
             (button as HTMLElement).style.pointerEvents === 'none' ||
             button.getAttribute('data-disabled') === 'true'
    }
    
    if (isButtonDisabled(submitButton)) {
      console.log('⚠️ [DEBUG] 通义千问: 发送按钮被禁用，等待启用...')
      // 等待按钮启用，增加重试次数和检查频率
      let enabledButton = null
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 重新查找按钮，因为DOM可能已更新
        const newButton = await waitForElementWithFilter(SUBMIT_SELECTORS, 1000)
        if (newButton && !isButtonDisabled(newButton)) {
          console.log('✅ [DEBUG] 通义千问: 找到已启用的按钮')
          enabledButton = newButton
          break
        }
        
        // 检查原按钮是否已启用
        if (!isButtonDisabled(submitButton)) {
          console.log('✅ [DEBUG] 通义千问: 原按钮已启用')
          enabledButton = submitButton
          break
        }
        
        if (i % 5 === 0) {
          console.log(`🔍 [DEBUG] 通义千问: 等待按钮启用中... (${i + 1}/20)`)
        }
      }
      
      if (enabledButton) {
        submitButton = enabledButton
      } else {
        console.warn('⚠️ [DEBUG] 通义千问: 按钮仍然被禁用，尝试强制点击')
      }
    }
    
    // 点击发送按钮
    const clickSuccess = clickSendButton(submitButton)
    
    if (!clickSuccess) {
      console.error('❌ [DEBUG] 通义千问: 点击发送按钮失败')
      return { success: false, error: '点击发送按钮失败' }
    }
    
    console.log('✅ [DEBUG] 通义千问: 发送成功')
    return { success: true, message: '自动发送成功' }
    
  } catch (error) {
    console.error('❌ [DEBUG] 通义千问: 发送错误:', error)
    return { success: false, error: error instanceof Error ? error.message : '未知错误' }
  }
}

/**
 * 处理填充并发送
 * @param text - 要填充的文本
 */
/**
 * 处理填充文本并发送的完整流程
 * @param text 要填充的文本内容
 * @returns 发送结果
 */
async function handleFillAndSend(text: string) {
  try {
    console.log(`[通义千问] 开始填充并发送: "${text}"`)
    
    // 1. 填充文本
    await handleFillText(text, false)
    console.log('🔍 [DEBUG] 通义千问: 文本填充完成，等待DOM更新...')
    
    // 2. 等待更长时间确保DOM完全更新
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 3. 检查输入框是否有内容
    const inputs = document.querySelectorAll('textarea, input[type="text"], div[contenteditable="true"]')
    let hasContent = false
    inputs.forEach(input => {
      const content = input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement 
        ? input.value 
        : input.textContent || ''
      if (content.trim().length > 0) {
        hasContent = true
        console.log(`🔍 [DEBUG] 通义千问: 输入框有内容: "${content.substring(0, 50)}..."`)
      }
    })
    
    if (!hasContent) {
      console.warn('⚠️ [DEBUG] 通义千问: 警告 - 未检测到输入框内容')
    }
    
    // 4. 触发input事件确保页面响应
    inputs.forEach(input => {
      try {
        const inputEvent = new Event('input', { bubbles: true })
        input.dispatchEvent(inputEvent)
        const changeEvent = new Event('change', { bubbles: true })
        input.dispatchEvent(changeEvent)
      } catch (e) {
        console.log('🔍 [DEBUG] 通义千问: 触发输入事件失败:', e)
      }
    })
    
    // 5. 再等待一下确保事件处理完成
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 6. 执行自动发送
    return await handleAutoSend()
  } catch (error) {
    console.error('[通义千问] 填充并发送失败:', error)
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
    platform: 'tongyi',
    url: window.location.href,
    inputElements,
    submitElements,
    timestamp: new Date().toISOString()
  }
}

// 初始化
/**
 * 页面加载时检测DOM结构
 */
function detectPageStructure() {
  console.log('🔍 [DEBUG] 通义千问: 开始检测页面结构...')
  
  // 检测所有可能的输入框
  const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]')
  console.log(`🔍 [DEBUG] 通义千问: 找到 ${allInputs.length} 个输入元素:`)
  
  allInputs.forEach((input, index) => {
    console.log(`  ${index + 1}. ${input.tagName} - class: "${input.className}" - placeholder: "${input.getAttribute('placeholder')}" - contenteditable: "${input.getAttribute('contenteditable')}"`)
  })
  
  // 检测所有可能的按钮
  const allButtons = document.querySelectorAll('button, [role="button"], div[class*="btn"], div[class*="send"], div[class*="submit"]')
  console.log(`🔍 [DEBUG] 通义千问: 找到 ${allButtons.length} 个按钮元素:`)
  
  allButtons.forEach((button, index) => {
    const text = button.textContent?.trim() || ''
    console.log(`  ${index + 1}. ${button.tagName} - class: "${button.className}" - text: "${text.substring(0, 20)}" - aria-label: "${button.getAttribute('aria-label')}"`)
  })
  
  // 检测页面URL
  console.log(`🔍 [DEBUG] 通义千问: 当前页面URL: ${window.location.href}`)
  console.log(`🔍 [DEBUG] 通义千问: 页面标题: ${document.title}`)
}

// 页面加载完成后检测
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(detectPageStructure, 1000)
  })
} else {
  setTimeout(detectPageStructure, 1000)
}

// 强制确认脚本加载
console.log('🚀 [FORCE] 通义千问内容脚本强制加载！')
console.log(`🚀 [FORCE] 当前URL: ${window.location.href}`)
console.log(`🚀 [FORCE] 页面标题: ${document.title}`)
console.log(`🚀 [FORCE] 用户代理: ${navigator.userAgent}`)

// 在页面标题中添加标记，确认脚本运行
if (document.title && !document.title.includes('[MYTAB]')) {
  document.title = '[MYTAB] ' + document.title
  console.log('🚀 [FORCE] 页面标题已标记')
}

setupMessageListener()
console.log('[通义千问] Content script已加载')
console.log(`🔍 [DEBUG] 通义千问: 脚本加载时间: ${new Date().toLocaleTimeString()}`)
console.log(`🔍 [DEBUG] 通义千问: 页面状态: ${document.readyState}`)

// 每5秒输出一次心跳，确认脚本持续运行
setInterval(() => {
  console.log(`💓 [HEARTBEAT] 通义千问脚本运行中 - ${new Date().toLocaleTimeString()}`)
}, 5000)