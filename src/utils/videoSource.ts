/**
 * 背景视频来源管理
 *
 * - 来源元信息（类型 / 在线地址 / 文件名）存 localStorage（扩展页面同源共享）
 * - 本地视频文件较大，存 IndexedDB（localStorage / chrome.storage 容量不够）
 * - newtab 与 options 同源，可共享读取
 */

export type VideoSourceType = 'default' | 'url' | 'local'

export interface VideoSource {
  type: VideoSourceType
  /** 在线地址（type === 'url' 时有效） */
  url?: string
  /** 本地文件名（type === 'local' 时展示用） */
  name?: string
}

const SOURCE_KEY = 'mytab-video-source'
const DB_NAME = 'mytab-media'
const STORE = 'media'
const BLOB_KEY = 'bgVideo'

/** 读取当前视频来源（同步） */
export function getVideoSource(): VideoSource {
  try {
    const raw = localStorage.getItem(SOURCE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as VideoSource
      if (parsed && (parsed.type === 'url' || parsed.type === 'local' || parsed.type === 'default')) {
        return parsed
      }
    }
  } catch {
    /* 忽略解析错误 */
  }
  return { type: 'default' }
}

function writeVideoSource(source: VideoSource): void {
  try {
    localStorage.setItem(SOURCE_KEY, JSON.stringify(source))
  } catch {
    /* 忽略存储错误 */
  }
}

/** 使用在线地址 */
export function setVideoUrl(url: string): void {
  writeVideoSource({ type: 'url', url })
}

/** 恢复为内置默认视频 */
export function setVideoDefault(): void {
  writeVideoSource({ type: 'default' })
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

/** 保存本地视频文件到 IndexedDB，并切换来源为 local */
export async function saveLocalVideo(file: File): Promise<void> {
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
  writeVideoSource({ type: 'local', name: file.name })
}

/** 读取本地视频并生成可播放的 objectURL；调用方负责 revoke */
export async function loadLocalVideoURL(): Promise<string | null> {
  try {
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

/** 清除本地视频并恢复默认 */
export async function clearLocalVideo(): Promise<void> {
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
  setVideoDefault()
}
