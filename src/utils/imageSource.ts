/**
 * 背景图片来源管理
 *
 * - 来源元信息（类型 / 在线地址 / 文件名）存 localStorage（扩展页面同源共享）
 * - 本地图片文件较大，存 IndexedDB（localStorage / chrome.storage 容量不够）
 * - newtab 与 options 同源，可共享读取
 * - 与背景视频共用同一个 IndexedDB（不同 key），互不影响
 */

import { migrationReady } from './migrateStorage'

export type ImageSourceType = 'none' | 'url' | 'local'

export interface ImageSource {
  type: ImageSourceType
  /** 在线地址（type === 'url' 时有效） */
  url?: string
  /** 本地文件名（type === 'local' 时展示用） */
  name?: string
}

const SOURCE_KEY = 'carrier-pigeon-image-source'
const DB_NAME = 'carrier-pigeon-media'
const STORE = 'media'
const BLOB_KEY = 'bgImage'

/** 读取当前图片来源（同步） */
export function getImageSource(): ImageSource {
  try {
    const raw = localStorage.getItem(SOURCE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ImageSource
      if (parsed && (parsed.type === 'url' || parsed.type === 'local' || parsed.type === 'none')) {
        return parsed
      }
    }
  } catch {
    /* 忽略解析错误 */
  }
  return { type: 'none' }
}

function writeImageSource(source: ImageSource): void {
  try {
    localStorage.setItem(SOURCE_KEY, JSON.stringify(source))
  } catch {
    /* 忽略存储错误 */
  }
}

/** 使用在线地址 */
export function setImageUrl(url: string): void {
  writeImageSource({ type: 'url', url })
}

/** 不使用背景图片 */
export function setImageNone(): void {
  writeImageSource({ type: 'none' })
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 保存本地图片文件到 IndexedDB，并切换来源为 local */
export async function saveLocalImage(file: File): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(file, BLOB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
  writeImageSource({ type: 'local', name: file.name })
}

/** 读取本地图片并生成可显示的 objectURL；调用方负责 revoke */
export async function loadLocalImageURL(): Promise<string | null> {
  try {
    await migrationReady
    const db = await openDB()
    try {
      const blob = await new Promise<Blob | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const r = tx.objectStore(STORE).get(BLOB_KEY)
        r.onsuccess = () => resolve(r.result as Blob | undefined)
        r.onerror = () => reject(r.error)
      })
      if (blob) {
        return URL.createObjectURL(blob)
      }
    } finally {
      db.close()
    }
  } catch {
    /* 忽略读取错误 */
  }
  return null
}

/** 清除本地图片并恢复为不使用 */
export async function clearLocalImage(): Promise<void> {
  try {
    const db = await openDB()
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(BLOB_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } finally {
      db.close()
    }
  } catch {
    /* 忽略 */
  }
  setImageNone()
}
