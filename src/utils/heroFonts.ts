/**
 * 按需注入 Hero 设计字体（Instrument Serif 标题 + Inter 正文）
 * 首页与设置页共用，保证两处视觉风格一致
 */
export function ensureHeroFonts(): void {
  if (typeof document === 'undefined' || document.getElementById('hero-fonts')) {
    return
  }
  const link = document.createElement('link')
  link.id = 'hero-fonts'
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap'
  document.head.appendChild(link)
}
