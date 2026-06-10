import React, { useEffect, useRef, useState } from 'react'
import type { ImageEffectConfig } from '../../utils/imageEffect'
import { CANVAS_EFFECT_RENDERERS, type EffectCleanup } from '../../utils/canvasEffects'

interface ImageEffectCanvasProps {
  /** 图片地址（在线地址或本地 objectURL） */
  src: string
  /** Canvas 类特效配置（像素化 / 粒子化 / 故障风 / 霓虹描边 / 数字雨 / 字符画） */
  effect: ImageEffectConfig
}

/**
 * Canvas 特效宿主：负责图片加载、尺寸管理与窗口缩放重建，
 * 具体绘制逻辑分发给 utils/canvasEffects 中对应的渲染器。
 */
export function ImageEffectCanvas({ src, effect }: ImageEffectCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    setReady(false)

    let disposed = false
    let resizeTimer = 0
    let cleanupEffect: EffectCleanup = () => undefined

    const img = new Image()
    // 在线图片尝试匿名跨域，成功则像素类特效可读像素；blob/扩展内资源不受影响
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = 'anonymous'
    }

    const setup = () => {
      if (disposed) {
        return
      }
      canvas.width = canvas.clientWidth || window.innerWidth
      canvas.height = canvas.clientHeight || window.innerHeight
      const renderer = CANVAS_EFFECT_RENDERERS[effect.type]
      if (renderer) {
        cleanupEffect = renderer(canvas, img, effect.intensity)
      }
      setReady(true)
    }

    const handleResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        cleanupEffect()
        setup()
      }, 200)
    }

    img.onload = () => {
      if (!disposed) {
        setup()
        window.addEventListener('resize', handleResize)
      }
    }
    img.onerror = () => {
      // 带 crossOrigin 加载失败时去掉再试一次（像素类特效会退化为原图绘制）
      if (img.crossOrigin) {
        img.crossOrigin = null
        img.src = src
      }
    }
    img.src = src

    return () => {
      disposed = true
      cleanupEffect()
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [src, effect.type, effect.intensity])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.8s ease' }}
    />
  )
}
