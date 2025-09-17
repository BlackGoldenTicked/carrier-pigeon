/**
 * 图标获取工具函数
 * 提供多种方式获取网站图标
 */

/**
 * 从URL中提取域名
 * @param url - 完整的URL
 * @returns 域名字符串
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error('Invalid URL:', url);
    return '';
  }
}

/**
 * 获取网站favicon的多种方式
 * @param url - 网站URL
 * @returns favicon URL数组，按优先级排序
 */
export function getFaviconUrls(url: string): string[] {
  const domain = extractDomain(url);
  if (!domain) return [];

  const protocol = url.startsWith('https://') ? 'https://' : 'http://';
  
  return [
    // 1. 标准favicon路径
    `${protocol}${domain}/favicon.ico`,
    // 2. 使用Google的favicon服务
    `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    // 3. 使用DuckDuckGo的favicon服务
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    // 4. 使用Yandex的favicon服务
    `https://favicon.yandex.net/favicon/${domain}`,
    // 5. 备用路径
    `${protocol}${domain}/favicon.png`,
    `${protocol}${domain}/apple-touch-icon.png`,
    `${protocol}${domain}/apple-touch-icon-precomposed.png`
  ];
}

/**
 * 异步获取可用的favicon URL
 * @param url - 网站URL
 * @returns Promise<string | null> - 第一个可用的favicon URL
 */
export async function getAvailableFavicon(url: string): Promise<string | null> {
  const faviconUrls = getFaviconUrls(url);
  
  for (const faviconUrl of faviconUrls) {
    try {
      const response = await fetch(faviconUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // 避免CORS问题
      });
      
      // 对于no-cors模式，我们无法检查状态码，所以直接返回第一个URL
      return faviconUrl;
    } catch (error) {
      // 继续尝试下一个URL
      continue;
    }
  }
  
  // 如果所有URL都失败，返回Google的favicon服务作为备用
  const domain = extractDomain(url);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;
}

/**
 * 批量获取多个网站的favicon
 * @param urls - 网站URL数组
 * @returns Promise<Map<string, string | null>> - URL到favicon URL的映射
 */
export async function batchGetFavicons(urls: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  const promises = urls.map(async (url) => {
    const favicon = await getAvailableFavicon(url);
    results.set(url, favicon);
  });
  
  await Promise.all(promises);
  return results;
}

/**
 * 为快捷链接自动生成图标URL
 * @param url - 网站URL
 * @returns 推荐的图标URL
 */
export function generateIconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';
  
  // 优先使用Google的favicon服务，因为它最稳定
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * 检查图标URL是否有效
 * @param iconUrl - 图标URL
 * @returns Promise<boolean> - 是否有效
 */
export async function isIconUrlValid(iconUrl: string): Promise<boolean> {
  try {
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = iconUrl;
    });
  } catch (error) {
    return false;
  }
}