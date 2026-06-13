/**
 * 背景图片特效配置
 *
 * - 配置（特效类型 / 强度）存 localStorage，newtab 与 options 同源共享，首屏同步读取
 * - CSS 滤镜类（虚化/黑白/怀旧）由 cssFilterFor 换算成 filter 字符串
 * - 暗角/颗粒为叠加层，像素化/粒子化为 Canvas 渲染，均在 ImageBackground 内分发
 */

export type ImageEffectType =
  | 'none'
  | 'blur'
  | 'grayscale'
  | 'sepia'
  | 'vignette'
  | 'grain'
  | 'hologram'
  | 'glitch'
  | 'neon'
  | 'matrix'
  | 'ascii'
  | 'pixelate'
  | 'particles'

export interface ImageEffectConfig {
  type: ImageEffectType
  /** 强度 0-100 */
  intensity: number
}

export interface ImageEffectOption {
  id: ImageEffectType
  label: string
  desc: string
}

/** 可选特效列表（设置页展示用） */
export const IMAGE_EFFECTS: ImageEffectOption[] = [
  { id: 'none', label: '无特效', desc: '原图直出' },
  { id: 'blur', label: '虚化', desc: '毛玻璃柔焦，突出前景内容' },
  { id: 'grayscale', label: '黑白', desc: '去色，安静克制' },
  { id: 'sepia', label: '怀旧', desc: '暖棕色调，胶片岁月感' },
  { id: 'vignette', label: '暗角', desc: '四周压暗，聚焦中心' },
  { id: 'grain', label: '颗粒', desc: '胶片噪点质感' },
  { id: 'hologram', label: '全息投影', desc: '青色扫描光束，赛博全息屏' },
  { id: 'glitch', label: '故障风', desc: '信号干扰式撕裂与色彩错位' },
  { id: 'neon', label: '霓虹描边', desc: '提取轮廓发光，暗夜赛博' },
  { id: 'matrix', label: '数字雨', desc: '黑客帝国式代码雨流过画面' },
  { id: 'ascii', label: '字符画', desc: '整幅图由字符拼成，终端美学' },
  { id: 'pixelate', label: '像素化', desc: '马赛克方块，复古游戏风' },
  { id: 'particles', label: '粒子化', desc: '图片化作浮动粒子，缓缓漂移' }
]

/** 由 Canvas 渲染的特效类型（其余为 CSS 滤镜 / 叠加层） */
export const CANVAS_EFFECT_TYPES: ReadonlySet<ImageEffectType> = new Set([
  'glitch',
  'neon',
  'matrix',
  'ascii',
  'pixelate',
  'particles'
])

/** 需要读取图片像素的特效（在线图片受 CORS 限制时会降级） */
export const PIXEL_READ_EFFECT_TYPES: ReadonlySet<ImageEffectType> = new Set([
  'neon',
  'matrix',
  'ascii',
  'particles'
])

const EFFECT_KEY = 'carrier-pigeon-image-effect'
export const DEFAULT_IMAGE_EFFECT: ImageEffectConfig = { type: 'none', intensity: 50 }

const VALID_TYPES = new Set<ImageEffectType>(IMAGE_EFFECTS.map((e) => e.id))

/** 约束强度到 0-100 */
export function clampIntensity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_IMAGE_EFFECT.intensity
  }
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** 读取特效配置（同步），非法字段回退默认 */
export function getImageEffect(): ImageEffectConfig {
  try {
    const raw = localStorage.getItem(EFFECT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ImageEffectConfig>
      return {
        type: VALID_TYPES.has(parsed.type as ImageEffectType)
          ? (parsed.type as ImageEffectType)
          : 'none',
        intensity: clampIntensity(Number(parsed.intensity))
      }
    }
  } catch {
    /* 忽略解析错误 */
  }
  return DEFAULT_IMAGE_EFFECT
}

/** 保存特效配置（同步） */
export function saveImageEffect(config: ImageEffectConfig): void {
  const safe: ImageEffectConfig = {
    type: VALID_TYPES.has(config.type) ? config.type : 'none',
    intensity: clampIntensity(config.intensity)
  }
  try {
    localStorage.setItem(EFFECT_KEY, JSON.stringify(safe))
  } catch {
    /* 忽略存储错误 */
  }
}

/** CSS 滤镜类特效 → filter 值；叠加层 / Canvas 类返回 undefined */
export function cssFilterFor(config: ImageEffectConfig): string | undefined {
  const t = clampIntensity(config.intensity) / 100
  switch (config.type) {
    case 'blur':
      return `blur(${Math.round(t * 24)}px)`
    case 'grayscale':
      return `grayscale(${t})`
    case 'sepia':
      return `sepia(${t})`
    case 'hologram':
      // 青色全息色调，强度控制染色深浅
      return `sepia(${(0.35 + t * 0.45).toFixed(2)}) saturate(${(2 + t * 2.5).toFixed(2)}) hue-rotate(150deg) brightness(0.92) contrast(1.05)`
    default:
      return undefined
  }
}
