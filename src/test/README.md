# OpenRouter 集成测试指南

## 测试概述

本文档描述了如何测试 OpenRouter 与 Pro 模式界面的集成功能。

## 测试步骤

### 1. 启动开发服务器

确保开发服务器正在运行：
```bash
npm run dev
```

### 2. 打开浏览器扩展

1. 在 Chrome 浏览器中打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目的 `build/chrome-mv3-dev` 目录

### 3. 测试 API 配置界面

1. 打开新标签页，应该看到 MyTab 扩展界面
2. 切换到 "Pro Mode"
3. 点击配置按钮（齿轮图标）
4. 验证以下功能：
   - API Key 输入框
   - 模型选择下拉框（应显示多个模型选项）
   - 刷新模型列表按钮
   - 保存和取消按钮

### 4. 配置 OpenRouter API

1. 在 API 配置弹窗中输入有效的 OpenRouter API Key
2. 选择一个模型（如 Claude 3 Haiku）
3. 点击"刷新模型列表"按钮，验证是否能获取到更多模型
4. 保存配置

### 5. 测试聊天功能

1. 在聊天输入框中输入测试消息
2. 发送消息并观察：
   - 消息是否正确发送
   - 是否收到流式响应
   - 响应是否正确显示
   - 错误处理是否正常工作

### 6. 使用浏览器控制台测试

打开浏览器开发者工具，在控制台中运行：

```javascript
// 测试 ProMode 集成配置
window.testProModeIntegration()

// 测试 OpenRouter 服务（需要有效的 API Key）
window.testOpenRouter()
```

## 测试检查清单

- [ ] API 配置界面正常显示
- [ ] 模型选择下拉框包含多个选项
- [ ] 刷新模型列表功能正常
- [ ] API Key 和模型配置能正确保存
- [ ] 聊天消息能正常发送
- [ ] 流式响应能正确接收和显示
- [ ] 错误处理机制正常工作
- [ ] 配置状态在页面刷新后保持

## 常见问题

### 1. 模型列表为空
- 检查 API Key 是否正确
- 检查网络连接
- 查看浏览器控制台是否有错误信息

### 2. 消息发送失败
- 验证 API Key 是否有效
- 检查选择的模型是否可用
- 查看网络请求是否被阻止

### 3. 流式响应不显示
- 检查 `transformMessage` 函数是否正确处理响应
- 验证 OpenRouter API 返回的数据格式
- 查看控制台错误信息

## 调试技巧

1. 使用浏览器开发者工具的 Network 标签查看 API 请求
2. 在控制台中查看详细的错误信息
3. 使用 `console.log` 在关键位置添加调试信息
4. 检查 localStorage 中的配置数据：
   ```javascript
   console.log('API Key:', localStorage.getItem('openrouter_api_key'))
   console.log('Model:', localStorage.getItem('openrouter_model'))
   ```

## 性能测试

1. 测试大量消息的处理性能
2. 验证内存使用情况
3. 检查长时间运行的稳定性
4. 测试网络中断后的恢复能力