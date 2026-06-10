import React, { useEffect, useRef, useState } from 'react'
import {
  cssFilterFor,
  CANVAS_EFFECT_TYPES,
  DEFAULT_IMAGE_EFFECT,
  type ImageEffectConfig
} from '../../utils/imageEffect'
import { ImageEffectCanvas } from './ImageEffectCanvas'

interface ImageBackgroundProps {
  /** 图片地址（在线地址或本地 objectURL） */
  src: string
  /** 特效配置，默认无特效 */
  effect?: ImageEffectConfig
}

/** 胶片噪点贴图（SVG feTurbulence，128px 平铺） */
const NOISE_TILE =
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='128' height='128' filter='url(%23n)'/></svg>`
  ) +
  '")'

/**
 * 全屏 hero 背景图片（支持特效）
 * - 虚化/黑白/怀旧：CSS filter；虚化时轻微放大隐藏边缘光晕
 * - 暗角：径向渐变叠加层；颗粒：SVG 噪点叠加层
 * - 像素化/粒子化：交给 ImageEffectCanvas 渲染
 * - 顶层叠加与背景视频一致的明/暗渐变遮罩，保证前景文字可读
 */
export function ImageBackground({ src, effect = DEFAULT_IMAGE_EFFECT }: ImageBackgroundProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  const isCanvasEffect = CANVAS_EFFECT_TYPES.has(effect.type)
  const filter = cssFilterFor(effect)
  const strength = effect.intensity / 100

  // src 变化时重置淡入状态
  useEffect(() => {
    setLoaded(false)
    const img = imgRef.current
    // 命中缓存时 onLoad 可能不触发，主动检查 complete
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [src])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {isCanvasEffect ? (
        <ImageEffectCanvas src={src} effect={effect} />
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={() => setLoaded(true)}
          // 全息投影：加载完成后启用随机闪烁（过早启用会与淡入打架）
          className={`absolute inset-0 h-full w-full object-cover ${
            effect.type === 'hologram' && loaded ? 'holo-flicker' : ''
          }`}
          style={{
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.8s ease',
            filter,
            // 虚化会让边缘渗出底色，轻微放大裁掉光晕
            transform: effect.type === 'blur' ? 'scale(1.06)' : undefined
          }}
        />
      )}

      {/* 全息投影：扫描线 + 滚动光束 */}
      {effect.type === 'hologram' && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(120,255,255,0.10) 0px, rgba(120,255,255,0.10) 1px, transparent 1px, transparent 3px)',
              opacity: 0.3 + strength * 0.5,
              mixBlendMode: 'screen'
            }}
          />
          <div
            className="holo-scan-beam absolute inset-x-0"
            style={{
              height: '16%',
              background:
                'linear-gradient(to bottom, transparent, rgba(140,255,255,0.22), transparent)',
              opacity: 0.4 + strength * 0.6
            }}
          />
        </>
      )}

      {/* 暗角叠加层 */}
      {effect.type === 'vignette' && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${(
              0.35 +
              strength * 0.5
            ).toFixed(2)}) 100%)`
          }}
        />
      )}

      {/* 胶片颗粒叠加层 */}
      {effect.type === 'grain' && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: NOISE_TILE,
            opacity: 0.08 + strength * 0.32,
            mixBlendMode: 'overlay'
          }}
        />
      )}

      {/* 渐变遮罩：明/暗用两层独立渲染，避免暗色渐变变量组合失效导致遮罩不生效 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.85)] via-[rgba(255,255,255,0.35)] to-[rgba(255,255,255,0.85)] dark:hidden" />
      <div className="absolute inset-0 hidden bg-gradient-to-b from-[rgba(5,5,5,0.97)] via-[rgba(5,5,5,0.85)] to-[rgba(5,5,5,0.97)] dark:block" />
    </div>
  )
}
