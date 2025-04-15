import React from 'react';
import { Select, Form, Input, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Option } = Select;

/**
 * 模型选择器组件
 * @param {Object} props 
 * @param {string} props.value 当前选中的模型配置
 * @param {function} props.onChange 模型变更回调
 * @param {Array} props.availableModels 可用模型列表
 * @param {boolean} props.showApiKey 是否显示API Key输入框
 */
const ModelSelector = ({ value = {}, onChange, availableModels = [], showApiKey = true }) => {
  // 默认值
  const defaultValue = {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000,
    ...value
  };

  // 处理模型提供商变更
  const handleProviderChange = (provider) => {
    // 根据提供商获取默认模型
    let defaultModel = '';
    switch (provider) {
      case 'openai':
        defaultModel = 'gpt-4o';
        break;
      case 'anthropic':
        defaultModel = 'claude-3-opus-20240229';
        break;
      case 'gemini':
        defaultModel = 'gemini-pro';
        break;
      case 'local':
        defaultModel = 'local-model';
        break;
      default:
        defaultModel = '';
    }

    const newValue = {
      ...defaultValue,
      provider,
      model: defaultModel
    };
    
    onChange(newValue);
  };

  // 处理模型变更
  const handleModelChange = (model) => {
    onChange({
      ...defaultValue,
      model
    });
  };

  // 处理API Key变更
  const handleApiKeyChange = (e) => {
    onChange({
      ...defaultValue,
      apiKey: e.target.value
    });
  };

  // 处理温度变更
  const handleTemperatureChange = (temperature) => {
    onChange({
      ...defaultValue,
      temperature
    });
  };

  // 处理最大token变更
  const handleMaxTokensChange = (maxTokens) => {
    onChange({
      ...defaultValue,
      maxTokens
    });
  };

  // 根据提供商获取可用模型
  const getModelsByProvider = (provider) => {
    const models = {
      openai: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
      ],
      anthropic: [
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
        { value: 'claude-2.1', label: 'Claude 2.1' }
      ],
      gemini: [
        { value: 'gemini-pro', label: 'Gemini Pro' },
        { value: 'gemini-ultra', label: 'Gemini Ultra' }
      ],
      local: [
        { value: 'local-model', label: '本地模型' }
      ]
    };

    return models[provider] || [];
  };

  return (
    <div className="model-selector">
      <Form layout="vertical" style={{ marginBottom: 0 }}>
        <Form.Item 
          label={
            <span>
              模型提供商 
              <Tooltip title="选择AI模型的提供商">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          style={{ marginBottom: 12 }}
        >
          <Select
            value={defaultValue.provider}
            onChange={handleProviderChange}
            style={{ width: '100%' }}
          >
            <Option value="openai">OpenAI</Option>
            <Option value="anthropic">Anthropic</Option>
            <Option value="gemini">Google Gemini</Option>
            <Option value="local">本地模型</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          label={
            <span>
              模型 
              <Tooltip title="选择特定的模型版本">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          style={{ marginBottom: 12 }}
        >
          <Select
            value={defaultValue.model}
            onChange={handleModelChange}
            style={{ width: '100%' }}
          >
            {getModelsByProvider(defaultValue.provider).map(model => (
              <Option key={model.value} value={model.value}>{model.label}</Option>
            ))}
          </Select>
        </Form.Item>

        {showApiKey && (
          <Form.Item 
            label={
              <span>
                API Key 
                <Tooltip title="输入对应提供商的API密钥">
                  <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </span>
            }
            style={{ marginBottom: 12 }}
          >
            <Input.Password
              value={defaultValue.apiKey}
              onChange={handleApiKeyChange}
              placeholder="输入API Key"
            />
          </Form.Item>
        )}

        <Form.Item 
          label={
            <span>
              温度 
              <Tooltip title="控制输出的随机性，值越高输出越多样">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          style={{ marginBottom: 12 }}
        >
          <Select
            value={defaultValue.temperature}
            onChange={handleTemperatureChange}
            style={{ width: '100%' }}
          >
            <Option value={0}>0 - 确定性 (最保守)</Option>
            <Option value={0.3}>0.3 - 低随机性</Option>
            <Option value={0.5}>0.5 - 平衡</Option>
            <Option value={0.7}>0.7 - 创造性 (推荐)</Option>
            <Option value={1}>1.0 - 高随机性</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          label={
            <span>
              最大Token数 
              <Tooltip title="限制生成文本的长度">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          style={{ marginBottom: 0 }}
        >
          <Select
            value={defaultValue.maxTokens}
            onChange={handleMaxTokensChange}
            style={{ width: '100%' }}
          >
            <Option value={500}>500 - 简短回复</Option>
            <Option value={1000}>1000 - 中等长度</Option>
            <Option value={2000}>2000 - 详细回复 (推荐)</Option>
            <Option value={4000}>4000 - 长篇内容</Option>
            <Option value={8000}>8000 - 非常详细</Option>
          </Select>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ModelSelector;
