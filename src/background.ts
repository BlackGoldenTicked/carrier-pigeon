/**
 * Background script for handling tab communication
 * 处理标签页通信的后台脚本
 */

/**
 * 监听来自content script和popup的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理打开新标签页并发送消息的请求
  if (request.action === 'openTabAndSendMessage') {
    const { url, message } = request
    
    /**
     * 检查是否已存在相同域名的标签页
     * @param targetUrl 目标URL
     * @returns Promise<chrome.tabs.Tab | null>
     */
    const findExistingTab = (targetUrl: string): Promise<chrome.tabs.Tab | null> => {
      return new Promise((resolve) => {
        chrome.tabs.query({}, (tabs) => {
          // 提取目标URL的域名
          const targetDomain = new URL(targetUrl).hostname
          
          // 查找相同域名的标签页
          const existingTab = tabs.find(tab => {
            if (!tab.url) return false
            try {
              const tabDomain = new URL(tab.url).hostname
              return tabDomain === targetDomain
            } catch {
              return false
            }
          })
          
          resolve(existingTab || null)
        })
      })
    }
    
    /**
     * 发送消息到指定标签页
     * @param tabId 标签页ID
     * @param messageToSend 要发送的消息
     */
    const sendMessageToTab = (tabId: number, messageToSend: any) => {
      const checkTabLoaded = () => {
        chrome.tabs.get(tabId, (updatedTab) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, message: '标签页不存在或已关闭' })
            return
          }
          
          if (updatedTab.status === 'complete') {
            // 页面加载完成，发送消息
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, messageToSend, (response) => {
                if (chrome.runtime.lastError) {
                  sendResponse({ success: false, message: '发送消息失败' })
                } else {
                  sendResponse({
                    success: true,
                    tabId: tabId,
                    response: response,
                    isExistingTab: true
                  })
                }
              })
            }, 1000) // 额外等待1秒确保content script已加载
          } else {
            // 页面还在加载，继续等待
            setTimeout(checkTabLoaded, 500)
          }
        })
      }
      
      checkTabLoaded()
    }
    
    // 先检查是否已存在相同域名的标签页
    findExistingTab(url).then((existingTab) => {
      if (existingTab && existingTab.id) {
        // 切换到已存在的标签页
        chrome.tabs.update(existingTab.id, { active: true }, () => {
          if (chrome.runtime.lastError) {
            // 如果切换失败，创建新标签页
            createNewTab()
          } else {
            // 发送消息到现有标签页
            sendMessageToTab(existingTab.id!, message)
          }
        })
      } else {
        createNewTab()
      }
    })
    
    /**
     * 创建新标签页
     */
    const createNewTab = () => {
      chrome.tabs.create({ url }, (tab) => {
        if (tab.id) {
          sendMessageToTab(tab.id, message)
        } else {
          sendResponse({ success: false, message: '创建标签页失败' })
        }
      })
    }
    
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
    // 标签页加载完成
  }
})