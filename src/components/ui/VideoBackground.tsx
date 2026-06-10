import React, { useEffect, useRef, useState } from 'react'

interface VideoBackgroundProps {
  /** 视频地址 */
  src: string
}

/** 系统是否开启「减弱动态效果」 */
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 电影感 hero 全屏背景视频（含性能优化）
 * - 原生 loop 无缝循环：解码器不中断，循环接缝无闪烁
 * - 仅在首次播放时淡入一次，之后保持不透明（循环处不再淡出，避免露出白底闪屏）
 * - 不使用 requestAnimationFrame，几乎零持续开销
 * - 标签页不可见时暂停，省电省 CPU
 * - 尊重系统「减弱动态效果」：开启时不渲染视频，仅保留静态背景
 */
export function VideoBackground({ src }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [enabled] = useState(() => !prefersReducedMotion())

  useEffect(() => {
    if (!enabled) {
      return
    }
    const video = videoRef.current
    if (!video) {
      return
    }

    let faded = false
    const fadeIn = () => {
      if (!faded) {
        faded = true
        video.style.opacity = '1'
      }
    }

    const play = () => {
      void video.play().catch(() => undefined)
    }

    // 首帧可见后淡入一次
    const handlePlaying = () => fadeIn()
    const handleTimeUpdate = () => {
      if (video.currentTime > 0.05) {
        fadeIn()
      }
    }
    const handleVisibility = () => {
      if (document.hidden) {
        video.pause()
      } else {
        play()
      }
    }

    video.addEventListener('playing', handlePlaying)
    video.addEventListener('timeupdate', handleTimeUpdate)
    document.addEventListener('visibilitychange', handleVisibility)
    if (!document.hidden) {
      play()
    }

    return () => {
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [enabled, src])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {enabled && (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0, transition: 'opacity 0.8s ease' }}
        />
      )}
      {/* 渐变遮罩：明/暗用两层独立渲染，避免暗色渐变变量组合失效导致遮罩不生效 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.85)] via-[rgba(255,255,255,0.35)] to-[rgba(255,255,255,0.85)] dark:hidden" />
      <div className="absolute inset-0 hidden bg-gradient-to-b from-[rgba(5,5,5,0.97)] via-[rgba(5,5,5,0.85)] to-[rgba(5,5,5,0.97)] dark:block" />
    </div>
  )
}
