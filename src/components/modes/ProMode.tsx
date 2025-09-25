import {
  AppstoreAddOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  CopyOutlined,
  DeleteOutlined,
  DislikeOutlined,
  EditOutlined,
  EllipsisOutlined,
  FileSearchOutlined,
  HeartOutlined,
  LikeOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ProductOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  SendOutlined,
  ShareAltOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import {
  Attachments,
  Bubble,
  Conversations,
  Prompts,
  Sender,
  Welcome,
  useXAgent,
  useXChat,
} from '@ant-design/x';
import { Button, Flex, type GetProp, Space, Spin, message } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { OpenRouterService } from '../../services/openrouter';
import { OpenRouterConfig } from '../../types/chat';
// 导入测试函数（仅在开发环境）
if (process.env.NODE_ENV === 'development') {
  import('../../test/openrouter-test');
}

type BubbleDataType = {
  role: string;
  content: string;
};

/**
 * 创建默认新对话
 */
const createDefaultConversation = () => ({
  key: 'new-conversation',
  label: '新对话',
  group: '今天',
});

const HOT_TOPICS = {
  key: '1',
  label: '热门话题',
  children: [
    {
      key: '1-1',
      description: 'Ant Design X 升级了什么？',
      icon: <span style={{ color: '#f93a4a', fontWeight: 700 }}>1</span>,
    },
    {
      key: '1-2',
      description: '新的 AGI 混合界面',
      icon: <span style={{ color: '#ff6565', fontWeight: 700 }}>2</span>,
    },
    {
      key: '1-3',
      description: 'Ant Design X 有哪些组件？',
      icon: <span style={{ color: '#ff8f1f', fontWeight: 700 }}>3</span>,
    },
    {
      key: '1-4',
      description: '来发现 AI 时代的新设计范式。',
      icon: <span style={{ color: '#00000040', fontWeight: 700 }}>4</span>,
    },
    {
      key: '1-5',
      description: '如何快速安装和导入组件？',
      icon: <span style={{ color: '#00000040', fontWeight: 700 }}>5</span>,
    },
  ],
};

const DESIGN_GUIDE = {
  key: '2',
  label: '设计指南',
  children: [
    {
      key: '2-1',
      icon: <HeartOutlined />,
      label: '意图',
      description: 'AI 理解用户需求并提供解决方案。',
    },
    {
      key: '2-2',
      icon: <SmileOutlined />,
      label: '角色',
      description: 'AI 的公众形象和个性',
    },
    {
      key: '2-3',
      icon: <CommentOutlined />,
      label: '对话',
      description: 'AI 如何以用户理解的方式表达自己',
    },
    {
      key: '2-4',
      icon: <PaperClipOutlined />,
      label: '界面',
      description: 'AI 平衡"聊天"和"执行"行为。',
    },
  ],
};

const SENDER_PROMPTS: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    description: '升级内容',
    icon: <ScheduleOutlined />,
  },
  {
    key: '2',
    description: '组件介绍',
    icon: <ProductOutlined />,
  },
  {
    key: '3',
    description: '设计指南',
    icon: <FileSearchOutlined />,
  },
  {
    key: '4',
    description: '安装说明',
    icon: <AppstoreAddOutlined />,
  },
];

const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      min-width: 1000px;
      height: 100vh;
      display: flex;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;
    `,
    // sider 样式
    sider: css`
      background: ${token.colorBgLayout}80;
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 12px;
      box-sizing: border-box;
    `,
    logo: css`
      display: flex;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;
      gap: 8px;
      margin: 24px 0;

      span {
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    addBtn: css`
      background: #1677ff0f;
      border: 1px solid #1677ff34;
      height: 40px;
    `,
    conversations: css`
      flex: 1;
      overflow-y: auto;
      margin-top: 12px;
      padding: 0;

      .ant-conversations-list {
        padding-inline-start: 0;
      }
    `,
    // chat list 样式
    chat: css`
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding-block: ${token.paddingLG}px;
      gap: 16px;
    `,
    chatPrompt: css`
      .ant-prompts-label {
        color: #000000e0 !important;
      }
      .ant-prompts-desc {
        color: #000000a6 !important;
        width: 100%;
      }
      .ant-prompts-icon {
        color: #000000a6 !important;
      }
    `,
    chatList: css`
      flex: 1;
      overflow: auto;
    `,
    loadingMessage: css`
      background-image: linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%);
      background-size: 100% 2px;
      background-repeat: no-repeat;
      background-position: bottom;
    `,
    placeholder: css`
      padding-top: 32px;
    `,
    // sender 样式
    sender: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    `,
    speechButton: css`
      font-size: 18px;
      color: ${token.colorText} !important;
    `,
    senderPrompt: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      color: ${token.colorText};
    `,
    configButton: css`
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 1000;
    `,
  };
});

/**
 * Pro 模式组件
 * 完整的AI对话功能，参考 Ant Design X 的设计
 */
const ProMode: React.FC = () => {
  const { styles } = useStyle();
  const abortController = useRef<AbortController | null>(null);

  // ==================== State ====================
  const [messageHistory, setMessageHistory] = useState<Record<string, any>>({});
  const defaultConversation = createDefaultConversation();
  const [conversations, setConversations] = useState([defaultConversation]);
  const [curConversation, setCurConversation] = useState(defaultConversation.key);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<GetProp<typeof Attachments, 'items'>>([]);
  const [inputValue, setInputValue] = useState('');
  const [configVisible, setConfigVisible] = useState(false);
  
  // OpenRouter 配置状态
  const [openRouterConfig, setOpenRouterConfig] = useState<OpenRouterConfig>({
    apiKey: localStorage.getItem('openrouter_api_key') || '',
    baseURL: 'https://openrouter.ai/api/v1',
    model: localStorage.getItem('openrouter_model') || 'anthropic/claude-3-haiku'
  });
  
  // OpenRouter 服务实例
  const [openRouterService, setOpenRouterService] = useState<OpenRouterService | null>(null);

  /**
   * OpenRouter Agent 配置
   */
  // ==================== Runtime ====================
  const [agent] = useXAgent<BubbleDataType>({
    baseURL: openRouterConfig.baseURL,
    model: openRouterConfig.model,
    dangerouslyApiKey: openRouterConfig.apiKey ? `Bearer ${openRouterConfig.apiKey}` : 'Bearer sk-xxxxxxxxxxxxxxxxxxxx',
  });
  const loading = agent.isRequesting();

  const { onRequest, messages, setMessages } = useXChat({
    agent,
    requestFallback: (_, { error }) => {
      console.error('请求失败:', error);
      
      if (error.name === 'AbortError') {
        return {
          content: '请求已中止',
          role: 'assistant',
        };
      }
      
      // 处理不同类型的错误
      const errorMessage = error.message || '未知错误';
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        message.error('API Key 无效，请检查配置');
        return {
          content: 'API Key 无效，请检查配置后重试。',
          role: 'assistant',
        };
      }
      
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        message.error('请求频率过高，请稍后重试');
        return {
          content: '请求频率过高，请稍后重试。',
          role: 'assistant',
        };
      }
      
      if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        return {
          content: '服务器内部错误，请稍后重试。',
          role: 'assistant',
        };
      }
      
      return {
        content: `请求失败：${errorMessage}，请重试！`,
        role: 'assistant',
      };
    },
    transformMessage: (info) => {
      const { originMessage, chunk } = info || {};
      let currentContent = '';
      
      try {
        // 处理 OpenRouter 的 SSE 流式响应
        if (chunk?.data && chunk.data !== '[DONE]') {
          // 移除 "data: " 前缀（如果存在）
          const cleanData = chunk.data.replace(/^data:\s*/, '');
          if (cleanData && cleanData !== '[DONE]') {
            const message = JSON.parse(cleanData);
            // OpenRouter 使用标准的 OpenAI 格式
            currentContent = message?.choices?.[0]?.delta?.content || '';
          }
        }
      } catch (error) {
        console.error('解析流式响应时出错:', error);
        // 如果解析失败，尝试直接使用 chunk 数据
        if (typeof chunk?.data === 'string' && chunk.data !== '[DONE]') {
          currentContent = chunk.data;
        }
      }

      const content = `${originMessage?.content || ''}${currentContent}`;
      return {
        content: content,
        role: 'assistant',
      };
    },
    resolveAbortController: (controller) => {
      abortController.current = controller;
    },
  });

  // ==================== Event ====================
  /**
   * 提交消息处理
   */
  const onSubmit = (val: string) => {
    if (!val) return;

    if (loading) {
      message.error('请求正在进行中，请等待请求完成。');
      return;
    }

    // 检查是否配置了 API Key
    if (!openRouterConfig.apiKey) {
      message.error('请先配置 API Key');
      setConfigVisible(true);
      return;
    }

    onRequest({
      stream: true,
      message: { role: 'user', content: val },
    });
  };

  /**
   * 显示 API 配置弹窗
   */
  const showApiConfig = () => {
    setConfigVisible(true);
  };

  // ==================== Nodes ====================
  const chatSider = (
    <div className={styles.sider}>
      {/* 🌟 Logo */}
      <div className={styles.logo}>
        <img
          src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*eco6RrQhxbMAAAAAAAAAAAAADgCCAQ/original"
          draggable={false}
          alt="logo"
          width={24}
          height={24}
        />
        <span> myTab Chat </span>
      </div>

      {/* 🌟 添加会话 */}
      <Button
        onClick={() => {
          if (agent.isRequesting()) {
            message.error(
              '消息正在请求中，您可以在请求完成后创建新对话或立即中止请求...',
            );
            return;
          }

          const now = dayjs().valueOf().toString();
          setConversations([
            {
              key: now,
              label: `新对话 ${conversations.length + 1}`,
              group: '今天',
            },
            ...conversations,
          ]);
          setCurConversation(now);
          setMessages([]);
        }}
        type="link"
        className={styles.addBtn}
        icon={<PlusOutlined />}
      >
        新建对话
      </Button>

      {/* 🌟 会话管理 */}
      <Conversations
        items={conversations}
        className={styles.conversations}
        activeKey={curConversation}
        onActiveChange={async (val) => {
          abortController.current?.abort();
          // 中止执行将触发异步 requestFallback，这可能导致时序问题
          // 在未来版本中，将添加 sessionId 功能来解决此问题
          setTimeout(() => {
            setCurConversation(val);
            setMessages(messageHistory?.[val] || []);
          }, 100);
        }}
        groupable
        styles={{ item: { padding: '0 8px' } }}
        menu={(conversation: any) => ({
          items: [
            {
              label: '删除',
              key: 'delete',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => {
                // 如果只有一个对话，不允许删除
                if (conversations.length <= 1) {
                  message.warning('至少需要保留一个对话');
                  return;
                }
                
                const newList = conversations.filter((item: any) => item.key !== conversation.key);
                const newKey = newList?.[0]?.key;
                setConversations(newList);
                
                // 如果删除的是当前对话，切换到第一个对话
                if (conversation.key === curConversation) {
                  setCurConversation(newKey);
                  setMessages(messageHistory?.[newKey] || []);
                }
              },
            },
          ],
        })}
      />
    </div>
  );

  const chatList = (
    <div className={styles.chatList}>
      {messages?.length ? (
        /* 🌟 消息列表 */
        <Bubble.List
          items={messages?.map((i) => ({
            ...i.message,
            classNames: {
              content: i.status === 'loading' ? styles.loadingMessage : '',
            },
            typing: i.status === 'loading' ? { step: 5, interval: 20, suffix: <>💗</> } : false,
          }))}
          style={{ height: '100%', paddingInline: 'calc(calc(100% - 700px) /2)' }}
          roles={{
            assistant: {
              placement: 'start',
              footer: (
                <div style={{ display: 'flex' }}>
                  <Button type="text" size="small" icon={<ReloadOutlined />} />
                  <Button type="text" size="small" icon={<CopyOutlined />} />
                  <Button type="text" size="small" icon={<LikeOutlined />} />
                  <Button type="text" size="small" icon={<DislikeOutlined />} />
                </div>
              ),
              loadingRender: () => <Spin size="small" />,
            },
            user: { placement: 'end' },
          }}
        />
      ) : (
        <Space
          direction="vertical"
          size={16}
          style={{ paddingInline: 'calc(calc(100% - 700px) /2)' }}
          className={styles.placeholder}
        >
          <Welcome
            variant="borderless"
            icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            title="你好，我是 myTab Chat"
            description="基于 Open router 提供的模型能力和 Ant Design X 界面解决方案，提供简单便捷的对话服务~"
          />
          <Flex gap={16}>
            <Prompts
              items={[HOT_TOPICS]}
              styles={{
                list: { height: '100%' },
                item: {
                  flex: 1,
                  backgroundImage: 'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)',
                  borderRadius: 12,
                  border: 'none',
                },
                subItem: { padding: 0, background: 'transparent' },
              }}
              onItemClick={(info) => {
                onSubmit(info.data.description as string);
              }}
              className={styles.chatPrompt}
            />

            <Prompts
              items={[DESIGN_GUIDE]}
              styles={{
                item: {
                  flex: 1,
                  backgroundImage: 'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)',
                  borderRadius: 12,
                  border: 'none',
                },
                subItem: { background: '#ffffffa6' },
              }}
              onItemClick={(info) => {
                onSubmit(info.data.description as string);
              }}
              className={styles.chatPrompt}
            />
          </Flex>
        </Space>
      )}
    </div>
  );

  const senderHeader = (
    <Sender.Header
      title="上传文件"
      open={attachmentsOpen}
      onOpenChange={setAttachmentsOpen}
      styles={{ content: { padding: 0 } }}
    >
      <Attachments
        beforeUpload={() => false}
        items={attachedFiles}
        onChange={(info) => setAttachedFiles(info.fileList)}
        placeholder={(type) =>
          type === 'drop'
            ? { title: '拖拽文件到此处' }
            : {
                icon: <CloudUploadOutlined />,
                title: '上传文件',
                description: '点击或拖拽文件到此区域上传',
              }
        }
      />
    </Sender.Header>
  );

  const chatSender = (
    <>
      {/* 🌟 提示词 */}
      <Prompts
        items={SENDER_PROMPTS}
        onItemClick={(info) => {
          onSubmit(info.data.description as string);
        }}
        styles={{
          item: { padding: '6px 12px' },
        }}
        className={styles.senderPrompt}
      />
      {/* 🌟 输入框 */}
      <Sender
        value={inputValue}
        header={senderHeader}
        onSubmit={() => {
          onSubmit(inputValue);
          setInputValue('');
        }}
        onChange={setInputValue}
        onCancel={() => {
          abortController.current?.abort();
        }}
        loading={loading}
        className={styles.sender}
        actions={(_, info) => {
          const { LoadingButton } = info.components;
          return (
            <Flex gap={4}>
              {loading ? (
                <LoadingButton type="default" />
              ) : (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => {
                    onSubmit(inputValue);
                    setInputValue('');
                  }}
                  disabled={!inputValue.trim()}
                />
              )}
            </Flex>
          );
        }}
        placeholder="问我任何问题..."
      />
    </>
  );

  useEffect(() => {
    // 历史记录模拟
    if (messages?.length) {
      setMessageHistory((prev) => ({
        ...prev,
        [curConversation]: messages,
      }));
    }
  }, [messages, curConversation]);

  // 初始化 OpenRouter 服务
  useEffect(() => {
    if (openRouterConfig.apiKey) {
      const service = new OpenRouterService(openRouterConfig);
      setOpenRouterService(service);
    }
  }, [openRouterConfig]);

  // ==================== API 配置弹窗 ====================
  const ApiConfigModal = () => {
    const [form, setForm] = useState({
      apiKey: localStorage.getItem('openrouter_api_key') || '',
      model: localStorage.getItem('openrouter_model') || 'anthropic/claude-3-haiku',
    });
    const [availableModels, setAvailableModels] = useState<Array<{id: string, name: string}>>([]);
    const [loadingModels, setLoadingModels] = useState(false);

    // 默认模型列表
    const defaultModels = [
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
      { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'openai/gpt-4', name: 'GPT-4' },
      { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'google/gemini-pro', name: 'Gemini Pro' },
      { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B Chat' },
      { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct' },
    ];

    // 获取可用模型列表
    const fetchModels = async () => {
      if (!form.apiKey) return;
      
      setLoadingModels(true);
      try {
        const service = new OpenRouterService({
          apiKey: form.apiKey,
          baseURL: 'https://openrouter.ai/api/v1',
          model: form.model
        });
        const models = await service.getModels();
        setAvailableModels(models.map(model => ({
          id: model.id,
          name: model.name || model.id
        })));
      } catch (error) {
        console.error('获取模型列表失败:', error);
        // 使用默认模型列表
        setAvailableModels(defaultModels);
      } finally {
        setLoadingModels(false);
      }
    };

    // 当 API Key 改变时，重新获取模型列表
    useEffect(() => {
      if (form.apiKey && configVisible) {
        fetchModels();
      } else {
        setAvailableModels(defaultModels);
      }
    }, [form.apiKey, configVisible]);

    const handleSave = () => {
      if (!form.apiKey) {
        message.error('请输入 API Key');
        return;
      }
      localStorage.setItem('openrouter_api_key', form.apiKey);
      localStorage.setItem('openrouter_model', form.model);
      
      // 更新 OpenRouter 配置状态
      setOpenRouterConfig({
        apiKey: form.apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        model: form.model
      });
      
      setConfigVisible(false);
      message.success('配置已保存');
    };

    return configVisible ? (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90vw',
        }}>
          <h3>API 配置</h3>
          <div style={{ marginBottom: '16px' }}>
            <label>API Key:</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                marginTop: '4px',
              }}
              placeholder="请输入 OpenRouter API Key"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label>模型:</label>
            <div style={{ position: 'relative' }}>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  marginTop: '4px',
                }}
                disabled={loadingModels}
              >
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {loadingModels && (
                <div style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}>
                  <Spin size="small" />
                </div>
              )}
            </div>
            {form.apiKey && (
              <Button
                size="small"
                onClick={fetchModels}
                loading={loadingModels}
                style={{ marginTop: '8px' }}
              >
                刷新模型列表
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button onClick={() => setConfigVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSave}>保存</Button>
          </div>
        </div>
      </div>
    ) : null;
  };

  // ==================== Render =================
  return (
    <div className={styles.layout}>
      {chatSider}

      <div className={styles.chat}>
        {chatList}
        {chatSender}
      </div>

      <ApiConfigModal />
    </div>
  );
};

export default ProMode;