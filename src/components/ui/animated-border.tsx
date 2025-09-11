import React, { useState, useEffect } from 'react'

interface AnimatedBorderProps {
  children: React.ReactNode
  className?: string
  isActive?: boolean
  animationDelay?: number
  onHover?: () => void
  onLeave?: () => void
}

/**
 * 彩色边框动画组件
 * 支持动态滑动边框效果和悬停特效
 */
export function AnimatedBorder({
  children,
  className = '',
  isActive = false,
  animationDelay = 0,
  onHover,
  onLeave
}: AnimatedBorderProps) {
  const [isHovered, setIsHovered] = useState(false)

  /**
   * 处理鼠标悬停
   */
  const handleMouseEnter = () => {
    setIsHovered(true)
    onHover?.()
  }

  /**
   * 处理鼠标离开
   */
  const handleMouseLeave = () => {
    setIsHovered(false)
    onLeave?.()
  }

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        animationDelay: `${animationDelay}ms`
      }}
    >
      {/* 动态边框 */}
      <div
        className={`
          absolute inset-0 rounded-xl
          bg-gradient-to-r from-pink-500 via-purple-500 via-blue-500 via-green-500 via-yellow-500 to-pink-500
          bg-[length:400%_400%]
          opacity-0 transition-all duration-500
          ${isActive ? 'opacity-100 animate-gradient-slide' : ''}
          ${isHovered ? 'opacity-100 animate-gradient-pulse' : ''}
        `}
        style={{
          padding: '2px',
          background: isHovered 
            ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)'
            : 'linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)',
          backgroundSize: isHovered ? '200% 200%' : '400% 400%',
          animation: isActive && !isHovered 
            ? 'gradientSlide 3s ease-in-out infinite'
            : isHovered 
            ? 'gradientPulse 1.5s ease-in-out infinite'
            : 'none'
        }}
      >
        {/* 内容容器 */}
        <div className="relative bg-white dark:bg-gray-900 rounded-xl h-full w-full overflow-hidden">
          {/* 悬停背景效果 */}
          <div
            className={`
              absolute inset-0 
              bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10
              opacity-0 transition-opacity duration-300
              ${isHovered ? 'opacity-100' : ''}
            `}
          />
          
          {/* 实际内容 */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 边框动画容器组件
 * 管理多个按钮的动态边框效果
 */
interface AnimatedBorderContainerProps {
  children: React.ReactNode
  className?: string
  autoPlay?: boolean
  interval?: number
}

export function AnimatedBorderContainer({
  children,
  className = '',
  autoPlay = true,
  interval = 3000
}: AnimatedBorderContainerProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  /**
   * 自动播放动画效果
   */
  useEffect(() => {
    if (!autoPlay || isPaused || hoveredIndex !== null) return

    const timer = setInterval(() => {
      setActiveIndex(prev => {
        const childrenArray = React.Children.toArray(children)
        return (prev + 1) % childrenArray.length
      })
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, interval, isPaused, hoveredIndex, children])

  /**
   * 处理子组件悬停
   */
  const handleChildHover = (index: number) => {
    setHoveredIndex(index)
    setIsPaused(true)
  }

  /**
   * 处理子组件离开
   */
  const handleChildLeave = () => {
    setHoveredIndex(null)
    setIsPaused(false)
  }

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isActive: activeIndex === index && hoveredIndex === null,
            animationDelay: index * 200,
            onHover: () => handleChildHover(index),
            onLeave: handleChildLeave
          })
        }
        return child
      })}
    </div>
  )
}