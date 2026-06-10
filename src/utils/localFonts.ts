/**
 * 本地内置字体的 @font-face CSS 加载器注册表
 *
 * 部分字体的远程 CDN 需要 Referer 才能访问，而扩展页面（chrome-extension://）
 * 不会携带 Referer，会导致请求被拒绝（403）并在控制台产生错误日志。
 * 这里通过动态导入（按需加载、独立分包）把字体以 base64 data URI 内置到本地，
 * 选中该字体时才加载，避免任何网络依赖与报错。
 *
 * key 为字体 id，value 为返回 @font-face CSS 字符串的异步加载函数。
 */
export const localFontLoaders: Record<string, () => Promise<string>> = {
  'muzai-pixel': async () => (await import('../config/muzaiPixelFont')).default
}

/**
 * 判断某字体是否为本地内置字体
 */
export const isLocalFont = (fontId: string): boolean =>
  Object.prototype.hasOwnProperty.call(localFontLoaders, fontId)
