import { useEffect, useState } from 'react'

/**
 * 极简模式组件
 * 提供一个完全空白的新标签页体验
 */
export default function MinimalMode() {
  const [isDark, setIsDark] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  /**
   * 检测当前主题状态
   */
  useEffect(() => {
    const checkTheme = () => {
      const htmlHasDark = document.documentElement.classList.contains('dark')
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      
      setIsDark(htmlHasDark)
      setDebugInfo(`系统偏好: ${systemPrefersDark ? '暗色' : '亮色'}, HTML类名: ${htmlHasDark ? '有dark' : '无dark'}`)
      
      console.log('主题状态检查:', {
        systemPrefersDark,
        htmlHasDark,
        htmlClasses: document.documentElement.className
      })
    }

    // 初始检查
    checkTheme()

    // 监听类名变化
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900 relative">
      {/* 调试信息 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 p-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs rounded shadow-lg z-50">
          <div>当前主题: {isDark ? '暗色模式' : '亮色模式'}</div>
          <div>{debugInfo}</div>
          <div className="mt-1 text-xs opacity-70">
            按 F12 打开控制台查看详细日志
          </div>
        </div>
      )}
      
      {/* 完全空白的页面 */}
    </div>
  )
}