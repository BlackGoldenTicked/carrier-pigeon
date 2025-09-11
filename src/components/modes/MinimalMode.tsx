import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

/**
 * 极简模式组件
 * 提供一个完全空白的新标签页体验，带有微妙的动画效果
 */
export default function MinimalMode() {
  const [mounted, setMounted] = useState(false)

  /**
   * 组件挂载动画
   */
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={cn(
      "min-h-screen w-full relative overflow-hidden",
      "bg-white dark:bg-gray-900",
      "transition-all duration-1000 ease-out",
      mounted ? "opacity-100" : "opacity-0"
    )}>
      {/* 微妙的背景渐变 */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-2000",
        "bg-gradient-to-br from-transparent via-gray-50/30 to-transparent",
        "dark:from-transparent dark:via-gray-800/20 dark:to-transparent",
        mounted ? "opacity-100" : "opacity-0"
      )} />
      
      {/* 主要内容区域 */}
      <div className="relative z-10 h-screen w-full flex items-center justify-center">
        {/* 可选的微妙装饰元素 */}
        <div className={cn(
          "w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700",
          "transition-all duration-3000 ease-out",
          mounted ? "opacity-20 scale-100" : "opacity-0 scale-0"
        )} />
      </div>
    </div>
  )
}