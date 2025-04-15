import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Switch, InputNumber, Tabs, message, Table, Modal, Divider, Space, Typography, Tooltip, Alert, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, KeyOutlined, QuestionCircleOutlined, ApiOutlined, CodeOutlined, RobotOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text, Title, Paragraph } = Typography;

/**
 * LLM管理组件
 * 用于管理不同的语言模型API和参数设置
 */
function LLMManager() {
  // LLM配置状态
  const [llmConfigs, setLlmConfigs] = useState([]);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [defaultLLM, setDefaultLLM] = useState('');
  
  // 预定义的模型提供商和模型列表
  const modelProviders = [
    { value: 'openai', label: 'OpenAI', description: 'OpenAI API (GPT模型)' },
    { value: 'anthropic', label: 'Anthropic', description: 'Anthropic API (Claude模型)' },
    { value: 'google', label: 'Google', description: 'Google API (Gemini模型)' },
    { value: 'deepseek', label: 'DeepSeek', description: 'DeepSeek API (DeepSeek模型)' },
    { value: 'custom', label: '自定义', description: '自定义API端点' }
  ];
  
  const modelOptions = {
    openai: [
      { value: 'gpt-4o', label: 'GPT-4o', description: 'OpenAI最新的多模态模型' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: '更快的GPT-4变体' },
      { value: 'gpt-4-1106-preview', label: 'GPT-4.1', description: 'GPT-4.1预览版' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: '性能与成本平衡的模型' }
    ],
    anthropic: [
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: 'Anthropic最强大的模型' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', description: '平衡能力与速度' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: '最快速的Claude模型' },
      { value: 'claude-3.5-sonnet-20240620', label: 'Claude 3.5 Sonnet', description: '最新的Claude 3.5模型' }
    ],
    google: [
      { value: 'gemini-pro', label: 'Gemini Pro', description: '适合大多数任务的平衡模型' },
      { value: 'gemini-ultra', label: 'Gemini Ultra', description: 'Google最强大的大语言模型' }
    ],
    deepseek: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat', description: 'DeepSeek通用对话模型' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder', description: '专为代码设计的模型' },
      { value: 'deepseek-v3', label: 'DeepSeek V3', description: 'DeepSeek V3模型' },
      { value: 'deepseek-r1', label: 'DeepSeek R1', description: 'DeepSeek R1推理模型' }
    ],
    custom: [
      { value: 'custom-model', label: '自定义模型', description: '自定义模型ID' }
    ]
  };
  
  // 默认API URL
  const defaultApiUrls = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    google: 'https://generativelanguage.googleapis.com/v1',
    deepseek: 'https://api.deepseek.com/v1'
  };
  
  // 加载LLM配置
  useEffect(() => {
    const savedConfigs = localStorage.getItem('llm_configs');
    if (savedConfigs) {
      try {
        const configs = JSON.parse(savedConfigs);
        setLlmConfigs(configs);
        
        // 设置默认LLM
        const defaultId = localStorage.getItem('default_llm');
        if (defaultId && configs.some(config => config.id === defaultId)) {
          setDefaultLLM(defaultId);
        } else if (configs.length > 0) {
          setDefaultLLM(configs[0].id);
          localStorage.setItem('default_llm', configs[0].id);
        }
      } catch (error) {
        console.error('加载LLM配置失败:', error);
        message.error('加载LLM配置失败');
      }
    }
  }, []);
  
  // 保存LLM配置
  const saveLLMConfigs = (configs) => {
    try {
      localStorage.setItem('llm_configs', JSON.stringify(configs));
      setLlmConfigs(configs);
      message.success('LLM配置已保存');
    } catch (error) {
      console.error('保存LLM配置失败:', error);
      message.error('保存LLM配置失败');
    }
  };
  
  // 添加新配置
  const addConfig = (config) => {
    const newConfig = {
      id: `llm_${Date.now()}`,
      ...config
    };
    
    const newConfigs = [...llmConfigs, newConfig];
    saveLLMConfigs(newConfigs);
    
    // 如果是第一个配置，设置为默认
    if (newConfigs.length === 1) {
      setDefaultLLM(newConfig.id);
      localStorage.setItem('default_llm', newConfig.id);
    }
    
    setShowAddModal(false);
  };
  
  // 更新配置
  const updateConfig = (config) => {
    const newConfigs = llmConfigs.map(c => 
      c.id === config.id ? config : c
    );
    saveLLMConfigs(newConfigs);
    setEditingConfig(null);
  };
  
  // 删除配置
  const deleteConfig = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个LLM配置吗？如果有角色正在使用此配置，可能会导致问题。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const newConfigs = llmConfigs.filter(c => c.id !== id);
        saveLLMConfigs(newConfigs);
        
        // 如果删除的是默认LLM，重新设置默认
        if (id === defaultLLM && newConfigs.length > 0) {
          setDefaultLLM(newConfigs[0].id);
          localStorage.setItem('default_llm', newConfigs[0].id);
        }
        
        message.success('LLM配置已删除');
      }
    });
  };
  
  // 设置默认LLM
  const setAsDefault = (id) => {
    setDefaultLLM(id);
    localStorage.setItem('default_llm', id);
    message.success('默认LLM已设置');
  };
  
  // 处理提供商变更
  const handleProviderChange = (provider, form) => {
    // 根据提供商设置默认API URL
    if (defaultApiUrls[provider]) {
      form.setFieldsValue({ apiUrl: defaultApiUrls[provider] });
    }
    
    // 如果有模型选项，设置第一个为默认
    if (modelOptions[provider] && modelOptions[provider].length > 0) {
      form.setFieldsValue({ model: modelOptions[provider][0].value });
    }
  };
  
  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {text}
          {record.id === defaultLLM && <Tag color="green">默认</Tag>}
        </Space>
      )
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      render: (text) => {
        const provider = modelProviders.find(p => p.value === text);
        return provider ? provider.label : text;
      }
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'API地址',
      dataIndex: 'apiUrl',
      key: 'apiUrl',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text"
            icon={<SaveOutlined />} 
            onClick={() => setAsDefault(record.id)}
            disabled={record.id === defaultLLM}
          >
            设为默认
          </Button>
          <Button 
            type="text"
            icon={<EditOutlined />} 
            onClick={() => setEditingConfig(record)}
          >
            编辑
          </Button>
          <Button 
            type="text"
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => deleteConfig(record.id)}
            disabled={record.id === defaultLLM && llmConfigs.length > 1}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];
  
  // 配置表单
  const ConfigForm = ({ initialValues = {}, onFinish }) => {
    const [form] = Form.useForm();
    const [provider, setProvider] = useState(initialValues.provider || 'openai');
    
    useEffect(() => {
      form.resetFields();
      form.setFieldsValue({
        name: '',
        provider: 'openai',
        model: 'gpt-4o',
        apiUrl: defaultApiUrls['openai'],
        apiKey: '',
        ...initialValues
      });
      setProvider(initialValues.provider || 'openai');
    }, [form, initialValues]);
    
    return (
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          name="name"
          label={
            <span>
              配置名称 
              <Tooltip title="给这个LLM配置一个有意义的名称，方便在角色配置中识别">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          rules={[{ required: true, message: '请输入配置名称' }]}
        >
          <Input placeholder="例如: OpenAI GPT-4o" />
        </Form.Item>
        
        <Form.Item
          name="provider"
          label={
            <span>
              API类型 
              <Tooltip title="选择模型提供商或API类型">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          rules={[{ required: true, message: '请选择API类型' }]}
        >
          <Select
            onChange={(value) => {
              setProvider(value);
              handleProviderChange(value, form);
            }}
          >
            {modelProviders.map(provider => (
              <Option key={provider.value} value={provider.value}>
                <Space>
                  {provider.label}
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    ({provider.description})
                  </Text>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="model"
          label={
            <span>
              模型ID 
              <Tooltip title="指定要调用的具体模型ID">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          rules={[{ required: true, message: '请选择或输入模型ID' }]}
        >
          {modelOptions[provider] ? (
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="选择模型"
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ padding: '0 8px 4px' }}>
                    <Input.Group compact>
                      <Input 
                        style={{ width: 'calc(100% - 64px)' }} 
                        placeholder="自定义模型ID"
                        onChange={(e) => {
                          if (e.target.value) {
                            form.setFieldsValue({ model: e.target.value });
                          }
                        }}
                      />
                      <Button 
                        type="primary"
                        onClick={() => {
                          const value = form.getFieldValue('model');
                          if (value) {
                            form.setFieldsValue({ model: value });
                          }
                        }}
                      >
                        确定
                      </Button>
                    </Input.Group>
                  </div>
                </>
              )}
            >
              {modelOptions[provider].map(model => (
                <Option key={model.value} value={model.value}>
                  <div>
                    <div>{model.label}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.45)' }}>
                      {model.description}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          ) : (
            <Input placeholder="输入模型ID，例如: gpt-4o, claude-3-opus" />
          )}
        </Form.Item>
        
        <Form.Item
          name="apiUrl"
          label={
            <span>
              API地址 
              <Tooltip title="API服务的基础URL地址">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          rules={[{ required: true, message: '请输入API地址' }]}
        >
          <Input placeholder="例如: https://api.openai.com/v1" />
        </Form.Item>
        
        <Form.Item
          name="apiKey"
          label={
            <span>
              API密钥 
              <Tooltip title="用于身份验证的API密钥">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          rules={[{ required: true, message: '请输入API密钥' }]}
        >
          <Input.Password placeholder="您的API密钥" />
        </Form.Item>
        
        <Divider />
        
        <Alert
          message="注意事项"
          description={
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              <li>API密钥将保存在本地存储中，请确保您的计算机安全</li>
              <li>导出角色时不会包含API密钥信息</li>
              <li>某些模型可能需要额外的参数，可在角色配置中单独设置</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存配置
            </Button>
            <Button onClick={() => {
              setEditingConfig(null);
              setShowAddModal(false);
            }}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };
  
  return (
    <div className="llm-manager">
      <Card 
        title={
          <Space>
            <RobotOutlined />
            <span>LLM配置管理</span>
          </Space>
        } 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setShowAddModal(true)}
          >
            添加LLM配置
          </Button>
        }
      >
        {llmConfigs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title level={4}>暂无LLM配置</Title>
            <Paragraph type="secondary">
              您需要添加至少一个LLM配置才能使用AI功能
            </Paragraph>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setShowAddModal(true)}
              style={{ marginTop: 16 }}
            >
              添加第一个LLM配置
            </Button>
          </div>
        ) : (
          <Table 
            dataSource={llmConfigs} 
            columns={columns} 
            rowKey="id"
            pagination={false}
          />
        )}
        
        <Divider />
        
        <div style={{ marginTop: 16 }}>
          <Title level={5}>支持的模型</Title>
          <Paragraph>
            本系统支持多种大语言模型，包括但不限于：
          </Paragraph>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
            <Card size="small" title="OpenAI" style={{ width: 200 }}>
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                <li>GPT-4o</li>
                <li>GPT-4.1</li>
                <li>GPT-4 Turbo</li>
                <li>GPT-3.5 Turbo</li>
              </ul>
            </Card>
            
            <Card size="small" title="Anthropic" style={{ width: 200 }}>
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                <li>Claude 3.5 Sonnet</li>
                <li>Claude 3 Opus</li>
                <li>Claude 3 Sonnet</li>
                <li>Claude 3 Haiku</li>
              </ul>
            </Card>
            
            <Card size="small" title="Google" style={{ width: 200 }}>
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                <li>Gemini Pro</li>
                <li>Gemini Ultra</li>
              </ul>
            </Card>
            
            <Card size="small" title="DeepSeek" style={{ width: 200 }}>
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                <li>DeepSeek V3</li>
                <li>DeepSeek R1</li>
                <li>DeepSeek Chat</li>
                <li>DeepSeek Coder</li>
              </ul>
            </Card>
          </div>
        </div>
      </Card>
      
      {/* 添加配置模态框 */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>添加LLM配置</span>
          </Space>
        }
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        footer={null}
        width={600}
      >
        <ConfigForm onFinish={addConfig} />
      </Modal>
      
      {/* 编辑配置模态框 */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>编辑LLM配置</span>
          </Space>
        }
        open={!!editingConfig}
        onCancel={() => setEditingConfig(null)}
        footer={null}
        width={600}
      >
        {editingConfig && <ConfigForm initialValues={editingConfig} onFinish={updateConfig} />}
      </Modal>
    </div>
  );
}

export default LLMManager;
