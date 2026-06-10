/**
 * 标题跑马灯的定时器 Worker
 *
 * 后台标签页的主线程 setInterval 会被 Chrome 限流到 ~1 次/秒，导致跑马灯卡顿。
 * Worker 内的定时器不受同样的限流，可保持稳定帧率，由主线程负责改写 document.title。
 */

let timer: ReturnType<typeof setInterval> | null = null

self.onmessage = (event: MessageEvent) => {
  const data = event.data as { type?: string; interval?: number } | null
  if (!data) {
    return
  }
  if (data.type === 'start' && typeof data.interval === 'number') {
    if (timer !== null) {
      clearInterval(timer)
    }
    timer = setInterval(() => (self as unknown as Worker).postMessage('tick'), data.interval)
  } else if (data.type === 'stop') {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }
}

export {}
