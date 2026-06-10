/**
 * 浏览器标签页标题跑马灯
 *
 * 标签页标题（document.title）过长时会被浏览器截断。这里通过定时轮转字符串，
 * 让标题在标签栏里横向滚动，方便在后台标签中也能看清完整内容。
 *
 * - 按 Unicode 码点轮转（Array.from），中文 / Emoji 不会被切坏
 * - 文本较短（不会被截断）时保持静态，不做无谓滚动
 * - 用 Web Worker 驱动定时器，绕开后台标签主线程的 setInterval 限流（~1 次/秒），
 *   保证滚动帧率稳定丝滑；Worker 不可用时回退到 setInterval
 */

export interface TitleMarqueeOptions {
  /** 每步滚动间隔（ms），越小越顺滑（但更费阅读） */
  speed?: number
  /** 循环之间的分隔符 */
  separator?: string
  /** 短于此长度（码点）则不滚动，直接静态显示 */
  minLength?: number
}

/**
 * 创建一个定时 ticker，优先用 Worker（不受后台限流），失败回退 setInterval。
 * 返回停止函数。
 */
function createTicker(interval: number, onTick: () => void): () => void {
  try {
    const worker = new Worker(new URL('./titleMarqueeWorker.ts', import.meta.url), {
      type: 'module'
    })
    worker.onmessage = () => onTick()
    worker.postMessage({ type: 'start', interval })
    return () => {
      worker.postMessage({ type: 'stop' })
      worker.terminate()
    }
  } catch {
    // Worker 不可用（如 CSP 限制）时回退到主线程定时器
    const timer = window.setInterval(onTick, interval)
    return () => window.clearInterval(timer)
  }
}

/**
 * 启动标题跑马灯，返回停止函数
 */
export function startTitleMarquee(text: string, options: TitleMarqueeOptions = {}): () => void {
  if (typeof document === 'undefined') {
    return () => undefined
  }

  const { speed = 120, separator = '   •   ', minLength = 14 } = options

  // 足够短，不会被截断 —— 静态显示即可
  if (Array.from(text).length <= minLength) {
    document.title = text
    return () => undefined
  }

  const loop = Array.from(`${text}${separator}`)
  let offset = 0

  const render = () => {
    document.title = loop.slice(offset).concat(loop.slice(0, offset)).join('')
    offset = (offset + 1) % loop.length
  }

  render()
  return createTicker(speed, render)
}
