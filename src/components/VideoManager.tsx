import React, { useEffect, useRef, useState } from 'react'
import defaultVideoUrl from 'url:../assets/hero.mp4'
import {
  getVideoSource,
  setVideoUrl,
  setVideoDefault,
  saveLocalVideo,
  loadLocalVideoURL,
  clearLocalVideo,
  type VideoSourceType
} from '../utils/videoSource'
import { ArrowUpRightIcon, VideoIcon } from './icons/ui'

/** 免费视频素材站 */
const RESOURCE_SITES = [
  { name: 'Pixabay', url: 'https://pixabay.com/', desc: '免费图片与视频素材' },
  { name: 'Pexels', url: 'https://www.pexels.com/zh-cn/', desc: '免费高质量视频素材' }
]

/**
 * 背景视频管理：选择内置 / 在线地址 / 本地上传
 */
export function VideoManager() {
  const [type, setType] = useState<VideoSourceType>('default')
  const [urlInput, setUrlInput] = useState('')
  const [localName, setLocalName] = useState<string | undefined>()
  const [previewSrc, setPreviewSrc] = useState<string>(defaultVideoUrl)
  const [status, setStatus] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewObjectUrl = useRef<string | null>(null)

  /** 释放上一个本地预览 objectURL */
  const revokePreview = () => {
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current)
      previewObjectUrl.current = null
    }
  }

  /** 根据当前来源刷新预览 */
  const refreshPreview = async () => {
    const source = getVideoSource()
    revokePreview()
    if (source.type === 'url' && source.url) {
      setPreviewSrc(source.url)
    } else if (source.type === 'local') {
      const objUrl = await loadLocalVideoURL()
      if (objUrl) {
        previewObjectUrl.current = objUrl
        setPreviewSrc(objUrl)
      } else {
        setPreviewSrc(defaultVideoUrl)
      }
    } else {
      setPreviewSrc(defaultVideoUrl)
    }
  }

  useEffect(() => {
    const source = getVideoSource()
    setType(source.type)
    setUrlInput(source.type === 'url' ? source.url ?? '' : '')
    setLocalName(source.type === 'local' ? source.name : undefined)
    void refreshPreview()
    return () => revokePreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = (msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(''), 2000)
  }

  const applyDefault = async () => {
    setVideoDefault()
    setType('default')
    setLocalName(undefined)
    await refreshPreview()
    flash('已切换为内置默认视频')
  }

  const applyUrl = async () => {
    const url = urlInput.trim()
    if (!url) {
      flash('请输入视频地址')
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      flash('请输入以 http(s):// 开头的地址')
      return
    }
    setVideoUrl(url)
    setType('url')
    await refreshPreview()
    flash('在线视频已保存')
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return
    }
    if (!file.type.startsWith('video/')) {
      flash('请选择视频文件')
      return
    }
    try {
      await saveLocalVideo(file)
      setType('local')
      setLocalName(file.name)
      await refreshPreview()
      flash('本地视频已保存')
    } catch {
      flash('保存失败，文件可能过大')
    }
  }

  const removeLocal = async () => {
    await clearLocalVideo()
    setType('default')
    setLocalName(undefined)
    await refreshPreview()
    flash('已移除本地视频')
  }

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-black text-white dark:bg-white dark:text-black'
        : 'text-[#6F6F6F] hover:bg-black/[0.05] hover:text-black dark:hover:bg-white/[0.06] dark:hover:text-white'
    }`

  return (
    <div className="space-y-6">
      {/* 来源类型 */}
      <div className="inline-flex items-center gap-1 rounded-full border border-black/10 p-1 dark:border-white/10">
        <button className={tabClass(type === 'default')} onClick={applyDefault}>
          内置默认
        </button>
        <button className={tabClass(type === 'url')} onClick={() => setType('url')}>
          在线地址
        </button>
        <button className={tabClass(type === 'local')} onClick={() => setType('local')}>
          本地上传
        </button>
      </div>

      {/* 在线地址 */}
      {type === 'url' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#6F6F6F]">视频地址（.mp4 / .webm）</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              placeholder="https://example.com/background.mp4"
              className="flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
            />
            <button
              onClick={applyUrl}
              className="shrink-0 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.03] dark:bg-white dark:text-black"
            >
              应用
            </button>
          </div>
        </div>
      )}

      {/* 本地上传 */}
      {type === 'local' && (
        <div className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              void handleFile(e.dataTransfer.files?.[0])
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragOver
                ? 'border-black bg-black/[0.03] dark:border-white dark:bg-white/[0.06]'
                : 'border-black/15 hover:border-black/40 dark:border-white/15 dark:hover:border-white/40'
            }`}
          >
            <VideoIcon className="h-7 w-7 text-[#6F6F6F]" />
            <div className="text-sm font-medium text-black dark:text-white">点击选择 或 拖拽视频到此处</div>
            <div className="text-xs text-[#9b9b9b]">支持 mp4 / webm，建议使用较小体积的循环视频</div>
            {localName && (
              <div className="mt-1 max-w-full truncate text-xs text-[#6F6F6F]">当前：{localName}</div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {localName && (
            <button
              onClick={removeLocal}
              className="rounded-full border border-black/10 px-4 py-1.5 text-xs text-[#6F6F6F] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              移除本地视频
            </button>
          )}
        </div>
      )}

      {/* 内置默认说明 */}
      {type === 'default' && (
        <p className="text-sm text-[#6F6F6F]">使用扩展内置的默认背景视频（已压缩，离线可用）。</p>
      )}

      {/* 状态提示 */}
      {status && <p className="text-xs text-[#6F6F6F]">{status}</p>}

      {/* 预览 */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[#6F6F6F]">预览</h3>
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-black dark:border-white/10">
          <video
            key={previewSrc}
            src={previewSrc}
            muted
            loop
            autoPlay
            playsInline
            className="aspect-video w-full object-cover"
          />
        </div>
      </div>

      {/* 免费视频素材站 */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[#6F6F6F]">下载免费视频素材</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RESOURCE_SITES.map((site) => (
            <a
              key={site.url}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-4 py-3 transition-colors hover:border-black/30 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/30 dark:hover:bg-white/[0.08]"
            >
              <div>
                <div className="text-sm font-medium text-black dark:text-white">{site.name}</div>
                <div className="text-xs text-[#9b9b9b]">{site.desc}</div>
              </div>
              <ArrowUpRightIcon className="h-4 w-4 text-[#9b9b9b] transition-colors group-hover:text-black dark:group-hover:text-white" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
