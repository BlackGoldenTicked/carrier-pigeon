/**
 * OpenRouter 服务测试文件
 * 用于验证 OpenRouter API 集成功能
 */

import { OpenRouterService } from '../services/openrouter';
import { OpenRouterConfig, ChatMessage } from '../types/chat';

/**
 * 测试 OpenRouter 服务基本功能
 */
export const testOpenRouterService = async () => {
  console.log('🧪 开始测试 OpenRouter 服务...');
  
  // 测试配置
  const testConfig: OpenRouterConfig = {
    apiKey: 'test-api-key', // 这里应该使用真实的 API Key
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3-haiku'
  };

  try {
    // 创建服务实例
    const service = new OpenRouterService(testConfig);
    console.log('✅ OpenRouter 服务实例创建成功');

    // 测试获取模型列表
    console.log('🔍 测试获取模型列表...');
    const models = await service.getModels();
    console.log(`✅ 成功获取 ${models.length} 个模型`);
    console.log('前5个模型:', models.slice(0, 5).map(m => m.id));

    // 测试发送消息（需要真实的 API Key）
    if (testConfig.apiKey !== 'test-api-key') {
      console.log('💬 测试发送消息...');
      const testMessage: ChatMessage = {
        id: 'test-' + Date.now(),
        role: 'user',
        content: '你好，请简单介绍一下你自己。',
        timestamp: Date.now()
      };
      
      const response = await service.sendMessage([testMessage]);
      
      console.log('✅ 消息发送成功，开始接收流式响应...');
      
      let fullResponse = '';
      const reader = response.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (value) {
          fullResponse += value;
          console.log('📝 接收到响应片段:', value.substring(0, 50) + '...');
        }
      }
      
      console.log('✅ 完整响应接收完成');
      console.log('📄 响应长度:', fullResponse.length);
    } else {
      console.log('⚠️  跳过消息发送测试（需要真实的 API Key）');
    }

    return {
      success: true,
      modelsCount: models.length,
      message: 'OpenRouter 服务测试通过'
    };

  } catch (error) {
    console.error('❌ OpenRouter 服务测试失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      message: 'OpenRouter 服务测试失败'
    };
  }
};

/**
 * 测试 ProMode 组件中的 OpenRouter 集成
 */
export const testProModeIntegration = () => {
  console.log('🧪 测试 ProMode 组件中的 OpenRouter 集成...');
  
  // 检查 localStorage 中的配置
  const apiKey = localStorage.getItem('openrouter_api_key');
  const model = localStorage.getItem('openrouter_model');
  
  console.log('🔑 API Key 状态:', apiKey ? '已配置' : '未配置');
  console.log('🤖 模型配置:', model || '未配置');
  
  // 检查配置完整性
  const isConfigured = !!(apiKey && model);
  
  return {
    isConfigured,
    apiKey: apiKey ? '***已配置***' : null,
    model,
    message: isConfigured ? 'ProMode 集成配置完整' : 'ProMode 集成配置不完整'
  };
};

// 导出测试函数供控制台使用
if (typeof window !== 'undefined') {
  (window as any).testOpenRouter = testOpenRouterService;
  (window as any).testProModeIntegration = testProModeIntegration;
  console.log('🔧 测试函数已挂载到 window 对象:');
  console.log('- window.testOpenRouter() - 测试 OpenRouter 服务');
  console.log('- window.testProModeIntegration() - 测试 ProMode 集成');
}