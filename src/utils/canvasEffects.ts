/**
 * Canvas 类背景图片特效渲染器
 *
 * 每个渲染器签名一致：接收已设好尺寸的 canvas、已加载完成的图片与强度（0-100），
 * 负责绘制（含自驱动动画），返回清理函数。由 ImageEffectCanvas 统一调度。
 *
 * - 需要读取像素的特效（粒子化/霓虹描边/字符画/数字雨取色）在跨域受限时优雅降级
 * - 动画统一用 rAF 驱动：后台标签自动暂停；尊重系统「减弱动态效果」
 */

import type { ImageEffectType } from './imageEffect'

export type EffectCleanup = () => void

export type CanvasEffectRenderer = (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  intensity: number
) => EffectCleanup

const noop: EffectCleanup = () => undefined

/** 系统是否开启「减弱动态效果」 */
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 按 cover 规则铺满目标尺寸的绘制参数 */
function coverRect(iw: number, ih: number, cw: number, ch: number) {
  const scale = Math.max(cw / iw, ch / ih)
  const dw = iw * scale
  const dh = ih * scale
  return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh }
}

/** 原图 cover 绘制（降级兜底） */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number
): void {
  const r = coverRect(img.naturalWidth, img.naturalHeight, cw, ch)
  ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh)
}

/**
 * 把图片 cover 采样到 w×h 并读取像素；跨域受限（画布被污染）时返回 null
 */
function readPixels(img: HTMLImageElement, w: number, h: number): Uint8ClampedArray | null {
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const octx = off.getContext('2d')
  if (!octx) {
    return null
  }
  drawCover(octx, img, w, h)
  try {
    return octx.getImageData(0, 0, w, h).data
  } catch {
    return null
  }
}

/** 生成铺满画布尺寸的底图离屏画布（可选 CSS 滤镜） */
function makeBase(
  img: HTMLImageElement,
  cw: number,
  ch: number,
  filter?: string
): HTMLCanvasElement | null {
  const base = document.createElement('canvas')
  base.width = cw
  base.height = ch
  const bctx = base.getContext('2d')
  if (!bctx) {
    return null
  }
  if (filter) {
    bctx.filter = filter
  }
  drawCover(bctx, img, cw, ch)
  return base
}

/* ============================== 像素化 ============================== */

export const renderPixelate: CanvasEffectRenderer = (canvas, img, intensity) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return noop
  }
  const cw = canvas.width
  const ch = canvas.height
  const block = Math.round(3 + (intensity / 100) * 37)
  const sw = Math.max(1, Math.round(cw / block))
  const sh = Math.max(1, Math.round(ch / block))
  const small = makeBase(img, sw, sh)
  if (!small) {
    return noop
  }
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, cw, ch)
  ctx.drawImage(small, 0, 0, cw, ch)
  return noop
}

/* ============================== 粒子化 ============================== */

interface Particle {
  x: number
  y: number
  color: string
  phase: number
  speed: number
  amp: number
  radius: number
}

/** 粒子总量上限，避免低性能设备掉帧 */
const MAX_PARTICLES = 15000

export const renderParticles: CanvasEffectRenderer = (canvas, img, intensity) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return noop
  }
  const cw = canvas.width
  const ch = canvas.height
  const t = intensity / 100

  let spacing = Math.round(8 + t * 18)
  while ((cw / spacing) * (ch / spacing) > MAX_PARTICLES) {
    spacing += 2
  }
  const cols = Math.max(1, Math.ceil(cw / spacing))
  const rows = Math.max(1, Math.ceil(ch / spacing))

  const data = readPixels(img, cols, rows)
  if (!data) {
    drawCover(ctx, img, cw, ch)
    return noop
  }

  const particles: Particle[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4
      if (data[i + 3] < 16) {
        continue
      }
      particles.push({
        x: x * spacing + spacing / 2,
        y: y * spacing + spacing / 2,
        color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
        amp: spacing * (0.25 + Math.random() * 0.35),
        radius: spacing * 0.32
      })
    }
  }

  const drawFrame = (time: number) => {
    ctx.clearRect(0, 0, cw, ch)
    const s = time / 1000
    for (const p of particles) {
      const ox = Math.sin(s * p.speed + p.phase) * p.amp
      const oy = Math.cos(s * p.speed * 0.8 + p.phase) * p.amp
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(s * p.speed + p.phase * 2)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x + ox, p.y + oy, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  if (prefersReducedMotion()) {
    drawFrame(0)
    return noop
  }
  let raf = 0
  const loop = (time: number) => {
    drawFrame(time)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}

/* ============================== 故障风 ============================== */

export const renderGlitch: CanvasEffectRenderer = (canvas, img, intensity) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return noop
  }
  const cw = canvas.width
  const ch = canvas.height
  const t = intensity / 100
  const base = makeBase(img, cw, ch)
  if (!base) {
    return noop
  }

  ctx.drawImage(base, 0, 0)
  if (prefersReducedMotion()) {
    return noop
  }

  let raf = 0
  let burstUntil = 0
  let nextBurst = performance.now() + 600
  let needRestore = false

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (now >= nextBurst) {
      // 强度越高：爆发越频繁、持续越久
      burstUntil = now + 100 + Math.random() * (80 + t * 260)
      nextBurst = burstUntil + 400 + Math.random() * (2400 - t * 2000)
    }
    const bursting = now < burstUntil
    if (!bursting) {
      // 爆发结束后恢复一帧干净画面即可，空闲期零绘制开销
      if (needRestore) {
        ctx.drawImage(base, 0, 0)
        needRestore = false
      }
      return
    }
    needRestore = true

    ctx.drawImage(base, 0, 0)
    // 水平撕裂切片
    const slices = 3 + Math.round(t * 9)
    for (let i = 0; i < slices; i++) {
      const sh = 8 + Math.random() * ch * 0.08
      const sy = Math.random() * (ch - sh)
      const dx = (Math.random() - 0.5) * (24 + t * 130)
      ctx.drawImage(base, 0, sy, cw, sh, dx, sy, cw, sh)
    }
    // RGB 通道错位残影
    const shift = 4 + t * 14
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.22 + t * 0.3
    ctx.filter = 'saturate(6) hue-rotate(90deg)'
    ctx.drawImage(base, shift, 0)
    ctx.filter = 'saturate(6) hue-rotate(-90deg)'
    ctx.drawImage(base, -shift, 0)
    ctx.filter = 'none'
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}

/* ============================== 霓虹描边 ============================== */

export const renderNeon: CanvasEffectRenderer = (canvas, img, intensity) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return noop
  }
  const cw = canvas.width
  const ch = canvas.height
  const t = intensity / 100

  // 降采样做边缘检测，控制计算量
  const scale = Math.min(1, 960 / cw)
  const ew = Math.max(2, Math.round(cw * scale))
  const eh = Math.max(2, Math.round(ch * scale))
  const data = readPixels(img, ew, eh)
  if (!data) {
    drawCover(ctx, img, cw, ch)
    return noop
  }

  // 亮度图
  const lum = new Float32Array(ew * eh)
  for (let i = 0; i < ew * eh; i++) {
    const j = i * 4
    lum[i] = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]
  }

  // Sobel 边缘，强度越高阈值越低（轮廓越丰富）
  const threshold = 90 - t * 60
  const edge = new ImageData(ew, eh)
  const ed = edge.data
  for (let y = 1; y < eh - 1; y++) {
    for (let x = 1; x < ew - 1; x++) {
      const i = y * ew + x
      const gx =
        -lum[i - ew - 1] - 2 * lum[i - 1] - lum[i + ew - 1] +
        lum[i - ew + 1] + 2 * lum[i + 1] + lum[i + ew + 1]
      const gy =
        -lum[i - ew - 1] - 2 * lum[i - ew] - lum[i - ew + 1] +
        lum[i + ew - 1] + 2 * lum[i + ew] + lum[i + ew + 1]
      const mag = Math.sqrt(gx * gx + gy * gy)
      if (mag < threshold) {
        continue
      }
      const j = i * 4
      // 边缘颜色取原像素并提亮到霓虹饱和度
      const r = data[j]
      const g = data[j + 1]
      const b = data[j + 2]
      const boost = 255 / Math.max(r, g, b, 64)
      ed[j] = Math.min(255, r * boost)
      ed[j + 1] = Math.min(255, g * boost)
      ed[j + 2] = Math.min(255, b * boost)
      ed[j + 3] = Math.min(255, mag)
    }
  }
  const edgeCanvas = document.createElement('canvas')
  edgeCanvas.width = ew
  edgeCanvas.height = eh
  edgeCanvas.getContext('2d')?.putImageData(edge, 0, 0)

  // 合成：深色底 + 微弱原图 + 辉光层 + 锐利描边
  ctx.fillStyle = '#020308'
  ctx.fillRect(0, 0, cw, ch)
  ctx.filter = 'brightness(0.22) saturate(1.2)'
  drawCover(ctx, img, cw, ch)
  ctx.filter = 'none'
  ctx.globalCompositeOperation = 'lighter'
  ctx.filter = `blur(${Math.round(4 + t * 8)}px)`
  ctx.drawImage(edgeCanvas, 0, 0, cw, ch)
  ctx.filter = 'none'
  ctx.globalAlpha = 0.9
  ctx.drawImage(edgeCanvas, 0, 0, cw, ch)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  return noop
}

/* ============================== 数字雨 ============================== */

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFXZ<>+*='
/** 经典矩阵绿（取不到像素颜色时的回退） */
const MATRIX_GREEN = 'rgb(0,255,140)'
/** 雨滴步进间隔（ms），低帧率反而更有点阵屏的味道 */
const MATRIX_TICK_MS = 50

export const renderMatrix: CanvasEffectRenderer = (canvas, img, intensity) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return noop
  }
  const cw = canvas.width
  const ch = canvas.height
  const t = intensity / 100

  // 强度越高：字号越小（雨更密）、底图越暗
  const fontSize = Math.round(20 - t * 8)
  const cols = Math.ceil(cw / fontSize)
  const rows = Math.ceil(ch / fontSize)
  const baseDim = makeBase(img, cw, ch, `brightness(${(0.5 - t * 0.3).toFixed(2)}) saturate(0.8)`)
  if (!baseDim) {
    return noop
  }
  // 取色采样：跨域受限时退化为经典绿，不影响特效本身
  const sample = readPixels(img, cols, rows)

  ctx.drawImage(baseDim, 0, 0)
  if (prefersReducedMotion()) {
    return noop
  }

  // 雨层独立画布：用 destination-out 实现拖尾渐隐，不影响底图
  const rain = document.createElement('canvas')
  rain.width = cw
  rain.height = ch
  const rctx = rain.getContext('2d')
  if (!rctx) {
    return noop
  }
  rctx.font = `${fontSize}px monospace`
  rctx.textBaseline = 'top'

  const drops = new Array<number>(cols)
  const speeds = new Array<number>(cols)
  for (let i = 0; i < cols; i++) {
    drops[i] = Math.floor(Math.random() * rows) - rows
    speeds[i] = 0.5 + Math.random()
  }

  const colorAt = (col: number, row: number): string => {
    if (!sample) {
      return MATRIX_GREEN
    }
    const j = (Math.min(rows - 1, Math.max(0, row)) * cols + col) * 4
    const r = sample[j]
    const g = sample[j + 1]
    const b = sample[j + 2]
    const boost = 230 / Math.max(r, g, b, 48)
    return `rgb(${Math.min(255, r * boost) | 0},${Math.min(255, g * boost) | 0},${Math.min(255, b * boost) | 0})`
  }

  let raf = 0
  let lastTick = 0
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (now - lastTick < MATRIX_TICK_MS) {
      return
    }
    lastTick = now

    // 拖尾渐隐
    rctx.globalCompositeOperation = 'destination-out'
    rctx.fillStyle = 'rgba(0,0,0,0.10)'
    rctx.fillRect(0, 0, cw, ch)
    rctx.globalCompositeOperation = 'source-over'

    for (let i = 0; i < cols; i++) {
      const row = Math.floor(drops[i])
      if (row >= 0 && row < rows) {
        const char = MATRIX_CHARS[(Math.random() * MATRIX_CHARS.length) | 0]
        rctx.fillStyle = colorAt(i, row)
        rctx.fillText(char, i * fontSize, row * fontSize)
      }
      drops[i] += speeds[i]
      if (drops[i] * fontSize > ch && Math.random() > 0.975) {
        drops[i] = 0
        speeds[i] = 0.5 + Math.random()
      }
    }

    ctx.drawImage(baseDim, 0, 0)
    ctx.drawImage(rain, 0, 0)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}

/* ============================== 字符画 ============================== */

/** 明度 → 字符密度（暗 → 亮） */
const ASCII_RAMP = ' .:-=+*#%@'

export const renderAscii: CanvasEffectRenderer = (canvas, img, intensity) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return noop
  }
  const cw = canvas.width
  const ch = canvas.height
  // 强度越高字符格越大（颗粒更明显）
  const cell = Math.round(6 + (intensity / 100) * 12)
  const cols = Math.max(1, Math.ceil(cw / cell))
  const rows = Math.max(1, Math.ceil(ch / cell))
  const data = readPixels(img, cols, rows)
  if (!data) {
    drawCover(ctx, img, cw, ch)
    return noop
  }

  ctx.fillStyle = '#050505'
  ctx.fillRect(0, 0, cw, ch)
  ctx.font = `${cell}px monospace`
  ctx.textBaseline = 'top'

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lumVal = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const char = ASCII_RAMP[Math.min(ASCII_RAMP.length - 1, (lumVal / 255) * ASCII_RAMP.length) | 0]
      if (char === ' ') {
        continue
      }
      // 略微提亮，让字符在深底上更清晰
      ctx.fillStyle = `rgb(${Math.min(255, r * 1.25) | 0},${Math.min(255, g * 1.25) | 0},${Math.min(255, b * 1.25) | 0})`
      ctx.fillText(char, x * cell, y * cell)
    }
  }
  return noop
}

/* ============================== 注册表 ============================== */

export const CANVAS_EFFECT_RENDERERS: Partial<Record<ImageEffectType, CanvasEffectRenderer>> = {
  pixelate: renderPixelate,
  particles: renderParticles,
  glitch: renderGlitch,
  neon: renderNeon,
  matrix: renderMatrix,
  ascii: renderAscii
}
