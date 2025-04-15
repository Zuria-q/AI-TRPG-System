import React, { useState, useEffect } from 'react';
import { Select, Form, InputNumber, Empty, Alert, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

/**
 * LLM选择器组件
 * 用于从已注册的LLM配置中选择模型
 * 
 * @param {Object} props
 * @param {Object} props.value - 当前选中的LLM配置
 * @param {Function} props.onChange - 配置变更回调
 */
const LLMSelector = ({ value = {}, onChange }) => {
  const [llmConfigs, setLlmConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  
  // 默认值
  const defaultValue = {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
    ...value
  };

  // 加载已注册的LLM配置
  useEffect(() => {
    const savedConfigs = localStorage.getItem('llm_configs');
    if (savedConfigs) {
      try {
        const configs = JSON.parse(savedConfigs);
        setLlmConfigs(configs);
        
        // 尝试找到匹配的配置
        const matchedConfig = configs.find(config => 
          config.provider === defaultValue.provider && 
          config.model === defaultValue.model
        );
        
        if (matchedConfig) {
          setSelectedConfig(matchedConfig.id);
        }
      } catch (error) {
        console.error('加载LLM配置失败:', error);
      }
    }
  }, [defaultValue.provider, defaultValue.model]);

  // 处理配置选择变更
  const handleConfigChange = (configId) => {
    const selectedConfig = llmConfigs.find(config => config.id === configId);
    if (selectedConfig) {
      setSelectedConfig(configId);
      
      // 更新配置，但保留原有的temperature和maxTokens
      const newValue = {
        provider: selectedConfig.provider,
        model: selectedConfig.model,
        apiUrl: selectedConfig.apiUrl,
        temperature: defaultValue.temperature,
        maxTokens: defaultValue.maxTokens
      };
      
      onChange(newValue);
    }
  };

  // 处理参数变更
  const handleParamChange = (param, value) => {
    onChange({
      ...defaultValue,
      [param]: value
    });
  };

  return (
    <div className="llm-selector">
      {llmConfigs.length === 0 ? (
        <Alert
          type="warning"
          message="未找到已注册的LLM配置"
          description={
            <div>
              <p>请先在LLM管理页面添加模型配置，然后再为角色选择模型。</p>
              <p>您可以在"系统设置" → "LLM管理"中添加模型配置。</p>
            </div>
          }
          showIcon
        />
      ) : (
        <Form layout="vertical">
          <Form.Item 
            label={
              <span>
                选择AI模型配置 
                <Tooltip title="从已注册的模型配置中选择一个用于此角色">
                  <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </span>
            }
          >
            <Select
              value={selectedConfig}
              onChange={handleConfigChange}
              placeholder="选择一个已注册的模型配置"
              style={{ width: '100%' }}
            >
              {llmConfigs.map(config => (
                <Option key={config.id} value={config.id}>
                  {config.name} ({config.provider} - {config.model})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item 
              label={
                <span>
                  温度 
                  <Tooltip title="控制生成文本的随机性，较高的值会产生更多样化的输出，较低的值会产生更确定性的输出">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={2}
                step={0.1}
                value={defaultValue.temperature}
                onChange={(value) => handleParamChange('temperature', value)}
                style={{ width: '100%' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                范围: 0.0 (确定性) - 2.0 (最大随机性)
              </Text>
            </Form.Item>
            
            <Form.Item 
              label={
                <span>
                  最大Token数 
                  <Tooltip title="限制模型生成的最大token数量，这会影响生成文本的长度">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              style={{ flex: 1 }}
            >
              <InputNumber
                min={100}
                max={8000}
                step={100}
                value={defaultValue.maxTokens}
                onChange={(value) => handleParamChange('maxTokens', value)}
                style={{ width: '100%' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                范围: 100 - 8000 (取决于模型限制)
              </Text>
            </Form.Item>
          </div>
          
          {selectedConfig && (
            <div style={{ marginTop: 16 }}>
              <Alert
                type="info"
                message="模型配置信息"
                description={
                  <div>
                    {llmConfigs.find(config => config.id === selectedConfig) && (
                      <>
                        <p><strong>提供商:</strong> {llmConfigs.find(config => config.id === selectedConfig).provider}</p>
                        <p><strong>模型:</strong> {llmConfigs.find(config => config.id === selectedConfig).model}</p>
                        <p><strong>API地址:</strong> {llmConfigs.find(config => config.id === selectedConfig).apiUrl}</p>
                      </>
                    )}
                  </div>
                }
              />
            </div>
          )}
        </Form>
      )}
    </div>
  );
};

export default LLMSelector;
