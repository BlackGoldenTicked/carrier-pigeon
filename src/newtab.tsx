import React from 'react'
import { createRoot } from 'react-dom/client'
import NewTabApp from './components/NewTabApp'
import './style.css'

/**
 * 新标签页入口组件
 * 初始化并渲染新标签页应用
 */
function init() {
  const rootContainer = document.querySelector('#__plasmo')
  if (!rootContainer) {
    throw new Error('Failed to find the root container')
  }

  const root = createRoot(rootContainer)
  root.render(<NewTabApp />)
}

init()