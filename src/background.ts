/**
 * Background script for handling tab communication
 * 处理标签页通信的后台脚本
 */

/**
 * 监听来自content script和popup的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔍 [DEBUG] Background script收到消息:', request)
  
  // 处理打开新标签页并发送消息的请求
  if (request.action === 'openTabAndSendMessage') {
    const { url, message } = request
    console.log('🔍 [DEBUG] Background - 提取的URL:', url)
    console.log('🔍 [DEBUG] Background - 提取的消息:', message)
    console.log('🔍 [DEBUG] Background - 消息中的文本:', message.text)
    
    // 打开新标签页
    chrome.tabs.create({ url }, (tab) => {
      if (tab.id) {
        // 等待页面加载完成后发送消息
        const checkTabLoaded = () => {
          chrome.tabs.get(tab.id!, (updatedTab) => {
            if (updatedTab.status === 'complete') {
              // 页面加载完成，发送消息
              setTimeout(() => {
                console.log('🔍 [DEBUG] Background - 准备发送消息到标签页:', tab.id, message)
                chrome.tabs.sendMessage(tab.id!, message, (response) => {
                  console.log('🔍 [DEBUG] Background - 发送消息到标签页的响应:', response)
                  sendResponse({
                    success: true,
                    tabId: tab.id,
                    response: response
                  })
                })
              }, 1000) // 额外等待1秒确保content script已加载
            } else {
              // 页面还在加载，继续等待
              setTimeout(checkTabLoaded, 500)
            }
          })
        }
        
        checkTabLoaded()
      } else {
        sendResponse({ success: false, message: '创建标签页失败' })
      }
    })
    
    return true // 保持消息通道开放
  }
  
  // 处理向指定标签页发送消息的请求
  if (request.action === 'sendMessageToTab') {
    const { tabId, message } = request
    
    chrome.tabs.sendMessage(tabId, message, (response) => {
      sendResponse({
        success: true,
        response: response
      })
    })
    
    return true
  }
})

/**
 * 监听标签页更新事件
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当标签页加载完成时，可以在这里做一些初始化工作
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('标签页加载完成:', tab.url)
  }
})

console.log('Background script已加载')