/**
 * Plasmo/Parcel 资源导入的类型声明
 * `url:` 方案会把文件复制到构建产物并返回其运行时 URL 字符串
 */
declare module 'url:*' {
  const url: string
  export default url
}
