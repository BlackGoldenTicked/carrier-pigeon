# MyTab - 智能新标签页扩展

基于 Plasmo 框架开发的 Chrome 扩展，提供三种不同的新标签页模式。

## 功能特性

### 🎯 两种模式

1. **极简模式** - 纯净的空白页面，专注于简洁体验
2. **一般模式** - 快捷链接和AI对话，平衡功能与简洁（开发中）

### ⚡ 快捷操作

- `Ctrl/Cmd + Shift + M` - 打开模式选择器
- `ESC` - 关闭模式选择器
- `1/2` - 快速切换到对应模式

## 开发环境

### 技术栈

- **框架**: Plasmo v0.90.5
- **前端**: React 18 + TypeScript
- **样式**: Tailwind CSS + Shadcn/ui
- **状态管理**: Plasmo Storage
- **动画**: Framer Motion

### 安装依赖

```bash
npm install --no-optional
```

### 开发模式

```bash
npm run dev
# 或
npx plasmo dev
```

### 构建扩展

```bash
npm run build
# 或
npx plasmo build
```

### 打包扩展

```bash
npm run package
# 或
npx plasmo package
```

## 安装扩展

1. 启动开发服务器：`npm run dev`
2. 打开 Chrome 浏览器
3. 访问 `chrome://extensions/`
4. 开启「开发者模式」
5. 点击「加载已解压的扩展程序」
6. 选择项目根目录下的 `build/chrome-mv3-dev` 文件夹
7. 扩展安装完成，打开新标签页即可使用

## 项目结构

```
mytab/
├── src/
│   ├── components/          # React 组件
│   │   ├── modes/          # 不同模式的组件
│   │   │   ├── MinimalMode.tsx
│   │   │   └── NormalMode.tsx
│   │   ├── ui/             # 基础 UI 组件
│   │   ├── NewTabApp.tsx   # 主应用组件
│   │   └── ModeSelector.tsx # 模式选择器
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具函数
│   ├── types/              # TypeScript 类型定义
│   ├── newtab.tsx          # 新标签页入口
│   └── style.css           # 全局样式
├── assets/                 # 静态资源
├── build/                  # 构建输出
└── package.json
```

## 开发状态

- ✅ 项目基础架构
- ✅ Tailwind CSS 配置
- ✅ 极简模式
- ✅ 模式切换器
- 🚧 一般模式（开发中）
- 🚧 Pro 模式（开发中）

## 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 许可证

MIT License

## 更新日志

### v0.0.1 (当前版本)

- 初始版本发布
- 实现极简模式
- 添加模式切换功能
- 基础 UI 组件库