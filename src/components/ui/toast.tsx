import React, { useEffect, useState } from 'react'
import { CheckIcon, XmarkIcon } from '../icons/ui'

/**
 * 轻量 Toast 系统（无外部依赖）
 *
 * - `toast(message, options)` 在任意模块中调用
 * - 页面挂载一个 <Toaster /> 负责渲染（newtab / options 各自的 React 根均可）
 * - 支持动作按钮（如「撤销」）、成功/提示/错误三种语气
 */

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastOptions {
  kind?: ToastKind
  /** 显示时长 ms，默认 3200；带动作按钮时默认 5000 */
  duration?: number
  /** 动作按钮（如撤销） */
  action?: {
    label: string
    onAction: () => void
  }
}

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
  duration: number
  action?: ToastOptions['action']
}

type Listener = (toasts: readonly ToastItem[]) => void

let nextId = 1
let items: readonly ToastItem[] = []
const listeners = new Set<Listener>()

function emit(): void {
  for (const fn of listeners) {
    fn(items)
  }
}

function remove(id: number): void {
  items = items.filter((t) => t.id !== id)
  emit()
}

/** 弹出一条 Toast，返回其 id（可用于手动关闭） */
export function toast(message: string, options: ToastOptions = {}): number {
  const id = nextId++
  const duration = options.duration ?? (options.action ? 5000 : 3200)
  const item: ToastItem = {
    id,
    message,
    kind: options.kind ?? 'info',
    duration,
    action: options.action
  }
  items = [...items.slice(-2), item]
  emit()
  window.setTimeout(() => remove(id), duration)
  return id
}

const KIND_DOT: Record<ToastKind, string> = {
  info: 'bg-ink3',
  success: 'bg-accent',
  error: 'bg-red-500'
}

/** Toast 渲染容器，每个页面挂载一次 */
export function Toaster() {
  const [list, setList] = useState<readonly ToastItem[]>(items)

  useEffect(() => {
    const listener: Listener = (next) => setList(next)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  if (list.length === 0) {
    return null
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-toast-in flex w-full items-center gap-3 rounded-[var(--radius)] border border-line bg-card px-4 py-3 text-sm text-ink shadow-[var(--shadow-l)]"
        >
          {t.kind === 'success' ? (
            <CheckIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          ) : (
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT[t.kind]}`} aria-hidden />
          )}
          <span className="min-w-0 flex-1">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action?.onAction()
                remove(t.id)
              }}
              className="shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => remove(t.id)}
            aria-label="关闭通知"
            className="shrink-0 rounded-[var(--radius-sm)] p-1 text-ink3 transition-colors hover:text-ink"
          >
            <XmarkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
