/**
 * 一次性存储键名迁移：MyTab → 信鸽 Carrier Pigeon
 *
 * 旧版本以 `mytab-` 为前缀的键名已发布给用户，重命名为 `carrier-pigeon-`
 * 时必须把已有数据搬到新键，避免老用户的链接 / 配置 / 背景丢失。
 *
 * 三类存储分别处理：
 * - localStorage：本机偏好与来源元信息，首屏需同步读取，故同步迁移
 * - chrome.storage.sync：跨设备的链接 / 模型 / 字体设置，异步迁移
 * - IndexedDB：体积较大的本地背景视频 / 图片 blob，按需复制（保留旧库做兜底）
 *
 * 迁移是幂等的：新键已存在时不覆盖，旧键迁移后删除（IndexedDB 例外，见下）。
 */

const OLD_PREFIX = 'mytab-'
const NEW_PREFIX = 'carrier-pigeon-'

/** localStorage 中需要改名的键（不含前缀） */
const LOCAL_SUFFIXES = [
  'current-mode',
  'video-source',
  'image-source',
  'bg-mode',
  'bg-video',
  'theme',
  'onboarding-dismissed',
  'hero-title',
  'image-effect',
  'font-settings'
] as const

/** chrome.storage.sync 中需要改名的键（不含前缀） */
const SYNC_SUFFIXES = ['links', 'models', 'config', 'font-settings'] as const

const OLD_MEDIA_DB = 'mytab-media'
const NEW_MEDIA_DB = 'carrier-pigeon-media'
const MEDIA_STORE = 'media'
const MEDIA_BLOB_KEYS = ['bgVideo', 'bgImage'] as const

/** 同步迁移 localStorage 键名；必须在任何首屏同步读取之前调用 */
function migrateLocalStorageSync(): void {
  try {
    for (const suffix of LOCAL_SUFFIXES) {
      const oldKey = OLD_PREFIX + suffix
      const newKey = NEW_PREFIX + suffix
      const oldVal = localStorage.getItem(oldKey)
      if (oldVal === null) {
        continue
      }
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldVal)
      }
      localStorage.removeItem(oldKey)
    }
  } catch {
    /* 存储不可用（如 Service Worker 环境）时静默跳过 */
  }
}

/** 异步迁移 chrome.storage.sync 键名 */
async function migrateSyncStorage(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
    return
  }
  try {
    const oldKeys = SYNC_SUFFIXES.map((s) => OLD_PREFIX + s)
    const newKeys = SYNC_SUFFIXES.map((s) => NEW_PREFIX + s)
    const [oldVals, newVals] = await Promise.all([
      chrome.storage.sync.get(oldKeys),
      chrome.storage.sync.get(newKeys)
    ])

    const toSet: Record<string, unknown> = {}
    const toRemove: string[] = []
    for (const suffix of SYNC_SUFFIXES) {
      const oldKey = OLD_PREFIX + suffix
      const newKey = NEW_PREFIX + suffix
      if (oldVals[oldKey] === undefined) {
        continue
      }
      if (newVals[newKey] === undefined) {
        toSet[newKey] = oldVals[oldKey]
      }
      toRemove.push(oldKey)
    }

    if (Object.keys(toSet).length > 0) {
      await chrome.storage.sync.set(toSet)
    }
    if (toRemove.length > 0) {
      await chrome.storage.sync.remove(toRemove)
    }
  } catch {
    /* 同步存储不可用时静默跳过 */
  }
}

function openMediaDB(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getBlob(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readonly')
    const r = tx.objectStore(MEDIA_STORE).get(key)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function putBlob(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite')
    tx.objectStore(MEDIA_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 把旧库的背景 blob 复制到新库。
 *
 * 仅当用户曾上传过本地视频 / 图片（来源类型为 local）时才执行，避免给从未用过
 * 本地背景的用户凭空创建一个空的旧 IndexedDB。复制后**保留旧库**作为兜底，
 * blob 体积大，万一复制异常也不至于丢数据。
 */
async function migrateMediaDB(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return
  }
  try {
    const usedLocalVideo = readLocalSourceType('video-source') === 'local'
    const usedLocalImage = readLocalSourceType('image-source') === 'local'
    if (!usedLocalVideo && !usedLocalImage) {
      return
    }

    const oldDb = await openMediaDB(OLD_MEDIA_DB)
    let newDb: IDBDatabase | null = null
    try {
      for (const key of MEDIA_BLOB_KEYS) {
        const blob = await getBlob(oldDb, key)
        if (blob === undefined) {
          continue
        }
        if (!newDb) {
          newDb = await openMediaDB(NEW_MEDIA_DB)
        }
        const existing = await getBlob(newDb, key)
        if (existing === undefined) {
          await putBlob(newDb, key, blob)
        }
      }
    } finally {
      oldDb.close()
      newDb?.close()
    }
  } catch {
    /* IndexedDB 不可用或迁移失败时静默跳过（旧库仍在，可重试） */
  }
}

/** 读取本机来源元信息的 type 字段（迁移后键名已是 carrier-pigeon-*） */
function readLocalSourceType(suffix: string): string | null {
  try {
    const raw = localStorage.getItem(NEW_PREFIX + suffix)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as { type?: string }
    return typeof parsed.type === 'string' ? parsed.type : null
  } catch {
    return null
  }
}

// localStorage 迁移在模块求值时立即同步执行，保证首屏同步读取拿到的是新键。
migrateLocalStorageSync()

/**
 * 异步存储迁移完成的 Promise。
 * 读取 chrome.storage.sync 或 IndexedDB 的入口应先 `await migrationReady`，
 * 避免与迁移竞争。
 */
export const migrationReady: Promise<void> = (async () => {
  await migrateSyncStorage()
  await migrateMediaDB()
})()
