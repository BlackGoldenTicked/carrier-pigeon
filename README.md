# 信鸽 Carrier Pigeon — AI 指令台新标签页

一句话同时发给多个 AI 平台的 Chrome 新标签页扩展。打开新标签页即可输入问题，一次分发到 ChatGPT、Kimi、DeepSeek、Claude 等平台，并集中管理常用网站。

技术栈：**Plasmo + React 18 + TypeScript + Tailwind CSS**（Chrome MV3）。

## 功能

### 两种模式

- **一般模式** — Hero 大标题 + AI 指令台 + 快捷链接，是默认的工作界面。
- **极简模式** — 纯净背景空页面，专注无干扰。

右上角分段按钮切换，也可用快捷键 `⌘/Ctrl + K` 打开模式面板，或 `⌘/Ctrl + 1`、`⌘/Ctrl + 2` 直接切换。

### AI 指令台（核心）

- 单输入框，最多 6000 字，接近上限时计数器变色提醒。
- 多选已启用的语言模型（默认全选），`⌘/Ctrl + Enter` 一键发送。
- 发送时按平台能力分流：
  - **支持自动填充**（ChatGPT / Kimi / DeepSeek / Claude）— 经后台 Service Worker 打开标签页，由内容脚本自动填入并发送。
  - **不支持自动填充** — 内容复制到剪贴板并打开页面，提示粘贴即可。
- 处理弹窗拦截、剪贴板失败等情况并给出明确提示。

### 快捷链接

- 网格展示，单击打开。
- `⌘/Ctrl + 点击` 多选，再点任意链接**批量打开**。
- 在「管理」面板中：输入网址即可添加（标题、favicon 自动补全）、内联改名/改址、拖拽排序、删除带「撤销」。
- 最多 20 个，无链接时显示引导卡。

### 管理面板（首页右上「管理」，右侧滑出）

集中高频操作：背景模式切换（视频 / 图片 / 纯色）、快捷链接增删改排序、AI 平台启用开关。`Esc` 关闭。

### 设置页（低频配置）

侧边栏分组导航：标题文字、字体、背景视频、背景图片、AI 平台、关于与快捷键。

### 外观

- **主题** — 深 / 浅手动切换，未设置时跟随系统；首屏同步应用，避免闪烁。
- **背景** — 内置 720p 低码率视频 / 在线 URL / 本地上传；图片支持 Canvas 特效。
- **Hero 标题** — 自定义文字 + 展示字体注入。
- **标签页标题** — 每次打开随机一句，过长时在标签栏滚动显示。

## 快捷键

| 快捷键 | 作用 |
| --- | --- |
| `⌘ / Ctrl + Enter` | 在 AI 指令台中发送 |
| `⌘ / Ctrl + K` | 打开模式选择面板 |
| `⌘ / Ctrl + 1` / `2` | 快速切换一般 / 极简模式 |
| `⌘ / Ctrl + 点击链接` | 多选链接，再点任意链接批量打开 |
| `Esc` | 关闭面板 |

## 数据存储

- **`chrome.storage.sync`（跨设备同步）** — 快捷链接、AI 模型配置。链接与模型分 key 存储以规避单项 8KB 配额；模型列表与内置 JSON 默认值智能合并（扩展更新新增的模型自动出现，用户的启用状态保留）；自动从旧版单 key 迁移。
- **`localStorage`（本机偏好）** — 背景模式、主题、新手提示关闭状态。
- **键名前缀** — 所有键统一使用 `carrier-pigeon-` 前缀；首次运行时自动从旧版 `mytab-` 前缀（含 IndexedDB 背景库）迁移，老用户数据不丢失。

## 开发

本扩展是 Chrome MV3 monorepo 的一部分，使用 pnpm。

```bash
pnpm install      # 安装依赖
pnpm dev          # 开发构建（HMR）→ build/chrome-mv3-dev
pnpm build        # 生产构建        → build/chrome-mv3-prod
pnpm package      # 打包上架用 zip
```

### 加载到 Chrome

1. 运行 `pnpm dev`。
2. 打开 `chrome://extensions/`，启用「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择 `build/chrome-mv3-dev`。
4. 打开新标签页即可使用。

## 项目结构

```
src/
├── newtab.tsx                  # 新标签页入口：模式切换、主题、配置加载与订阅
├── options.tsx                 # 设置页：外观 / AI 平台 / 关于
├── background.ts               # Service Worker：打开标签页 + 注入消息
├── components/
│   ├── NormalMode.tsx          # 一般模式：Hero + AI 指令台 + 快捷链接
│   ├── QuickSettingsPanel.tsx  # 首页管理面板（右侧滑出）
│   ├── FontManager.tsx         # 字体设置
│   ├── HeroTitleManager.tsx    # 标题文字设置
│   ├── VideoManager.tsx        # 背景视频来源设置
│   ├── ImageManager.tsx        # 背景图片来源与特效设置
│   ├── icons/                  # AI 平台与 UI 图标
│   └── ui/                     # mode-selector、toast、背景与特效组件
├── utils/
│   ├── appConfig.ts            # 链接 / 模型存储层（chrome.storage.sync）
│   ├── prefs.ts                # 本机偏好（localStorage）
│   ├── configLoader.ts         # 读取内置 JSON 默认配置
│   ├── videoSource.ts          # 背景视频来源解析
│   ├── imageSource.ts          # 背景图片来源解析
│   ├── heroTitle.ts            # Hero 标题配置与样式
│   └── fontInjector.ts         # 字体注入
├── config/                     # 内置默认 JSON：链接、模型、字体、模式、语录
├── contents/                   # 各 AI 平台的自动填充内容脚本
├── hooks/                      # useFontSettings 等自定义 Hook
└── style.css                   # 设计令牌 + Tailwind
```

## 许可证

MIT License
