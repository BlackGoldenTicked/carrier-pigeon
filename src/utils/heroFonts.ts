/**
 * 按需注入 Hero 展示字体
 * 标题：Young Serif（温暖的展示衬线）+ Noto Serif SC 中文回退
 * 正文走系统字体栈（见 style.css 的 --font），无需注入
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
    'https://fonts.googleapis.com/css2?family=Young+Serif&family=Noto+Serif+SC:wght@500;600&display=swap'
  document.head.appendChild(link)
}
