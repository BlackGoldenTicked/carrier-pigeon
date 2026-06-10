import React, { useEffect, useRef, useState } from 'react'
import {
  getImageSource,
  setImageUrl,
  setImageNone,
  saveLocalImage,
  loadLocalImageURL,
  clearLocalImage,
  type ImageSourceType
} from '../utils/imageSource'
import {
  getImageEffect,
  saveImageEffect,
  clampIntensity,
  IMAGE_EFFECTS,
  PIXEL_READ_EFFECT_TYPES,
  type ImageEffectConfig
} from '../utils/imageEffect'
import { ImageBackground } from './ui/ImageBackground'
import { ArrowUpRightIcon, ImageIcon } from './icons/ui'

/** 免费高清图片素材站 */
const RESOURCE_SITES = [
  { name: 'Unsplash', url: 'https://unsplash.com/', desc: '免费高分辨率摄影壁纸' },
  { name: 'Wallhaven', url: 'https://wallhaven.cc/', desc: '海量高清壁纸社区' }
]

/**
 * 背景图片管理：不使用 / 在线地址 / 本地上传
 */
export function ImageManager() {
  const [type, setType] = useState<ImageSourceType>('none')
  const [urlInput, setUrlInput] = useState('')
  const [localName, setLocalName] = useState<string | undefined>()
  const [previewSrc, setPreviewSrc] = useState<string>('')
  const [effect, setEffect] = useState<ImageEffectConfig>(() => getImageEffect())
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
    const source = getImageSource()
    revokePreview()
    if (source.type === 'url' && source.url) {
      setPreviewSrc(source.url)
    } else if (source.type === 'local') {
      const objUrl = await loadLocalImageURL()
      if (objUrl) {
        previewObjectUrl.current = objUrl
        setPreviewSrc(objUrl)
      } else {
        setPreviewSrc('')
      }
    } else {
      setPreviewSrc('')
    }
  }

  useEffect(() => {
    const source = getImageSource()
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

  const applyNone = async () => {
    setImageNone()
    setType('none')
    setLocalName(undefined)
    await refreshPreview()
    flash('已关闭背景图片')
  }

  const applyUrl = async () => {
    const url = urlInput.trim()
    if (!url) {
      flash('请输入图片地址')
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      flash('请输入以 http(s):// 开头的地址')
      return
    }
    setImageUrl(url)
    setType('url')
    await refreshPreview()
    flash('在线图片已保存')
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return
    }
    if (!file.type.startsWith('image/')) {
      flash('请选择图片文件')
      return
    }
    try {
      await saveLocalImage(file)
      setType('local')
      setLocalName(file.name)
      await refreshPreview()
      flash('本地图片已保存')
    } catch {
      flash('保存失败，文件可能过大')
    }
  }

  const removeLocal = async () => {
    await clearLocalImage()
    setType('none')
    setLocalName(undefined)
    await refreshPreview()
    flash('已移除本地图片')
  }

  /** 更新特效配置：保存 + 预览即时生效 */
  const updateEffect = (patch: Partial<ImageEffectConfig>) => {
    const next: ImageEffectConfig = { ...effect, ...patch }
    setEffect(next)
    saveImageEffect(next)
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
        <button className={tabClass(type === 'none')} onClick={applyNone}>
          不使用
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
          <label className="block text-sm font-medium text-[#6F6F6F]">图片地址（.jpg / .png / .webp）</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              placeholder="https://example.com/background.jpg"
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
            <ImageIcon className="h-7 w-7 text-[#6F6F6F]" />
            <div className="text-sm font-medium text-black dark:text-white">点击选择 或 拖拽图片到此处</div>
            <div className="text-xs text-[#9b9b9b]">支持 jpg / png / webp，建议使用高分辨率横向图片</div>
            {localName && (
              <div className="mt-1 max-w-full truncate text-xs text-[#6F6F6F]">当前：{localName}</div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {localName && (
            <button
              onClick={removeLocal}
              className="rounded-full border border-black/10 px-4 py-1.5 text-xs text-[#6F6F6F] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              移除本地图片
            </button>
          )}
        </div>
      )}

      {/* 不使用说明 */}
      {type === 'none' && (
        <p className="text-sm text-[#6F6F6F]">未设置背景图片。选择「在线地址」或「本地上传」即可启用。</p>
      )}

      {/* 状态提示 */}
      {status && <p className="text-xs text-[#6F6F6F]">{status}</p>}

      {/* 特效 */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[#6F6F6F]">图片特效</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {IMAGE_EFFECTS.map((option) => {
            const active = effect.type === option.id
            return (
              <button
                key={option.id}
                onClick={() => updateEffect({ type: option.id })}
                className={`rounded-xl border p-3 text-left transition-all ${
                  active
                    ? 'border-black bg-black/[0.04] dark:border-white dark:bg-white/[0.06]'
                    : 'border-black/10 hover:border-black/30 hover:bg-black/[0.02] dark:border-white/10 dark:hover:border-white/30 dark:hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black dark:text-white">{option.label}</span>
                  {active && <div className="h-2 w-2 rounded-full bg-black dark:bg-white" />}
                </div>
                <div className="mt-1 text-xs text-[#9b9b9b]">{option.desc}</div>
              </button>
            )
          })}
        </div>

        {/* 强度 */}
        {effect.type !== 'none' && (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-[#6F6F6F]">
              特效强度：{effect.intensity}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={effect.intensity}
              onChange={(e) => updateEffect({ intensity: clampIntensity(Number(e.target.value)) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black dark:bg-white/15 dark:accent-white"
            />
            <div className="mt-1 flex justify-between text-xs text-[#9b9b9b]">
              <span>轻微</span>
              <span>强烈</span>
            </div>
          </div>
        )}

        {PIXEL_READ_EFFECT_TYPES.has(effect.type) && (
          <p className="mt-2 text-xs text-[#9b9b9b]">
            此特效需要读取图片像素：本地上传不受限；在线图片需站点支持跨域（如
            Unsplash），否则自动降级（数字雨退化为经典绿色，其余退化为原图显示）。
          </p>
        )}
      </div>

      {/* 预览（实时渲染特效与明暗遮罩，即最终效果） */}
      {previewSrc && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-[#6F6F6F]">预览</h3>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-black/10 bg-black dark:border-white/10">
            <ImageBackground key={previewSrc} src={previewSrc} effect={effect} />
          </div>
        </div>
      )}

      {/* 免费图片素材站 */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[#6F6F6F]">下载免费高清壁纸</h3>
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
