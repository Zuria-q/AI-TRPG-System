import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Button, Slider, Select, Tag, message, Upload, Divider, Space, Row, Col, Typography, Card, InputNumber, Avatar, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, UploadOutlined, ExportOutlined, UserOutlined, RobotOutlined, TeamOutlined, InfoCircleOutlined } from '@ant-design/icons';
import agentRegistry from '../agent_registry';
import LLMSelector from './LLMSelector';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

/**
 * 角色详细编辑器组件
 * 用于编辑角色的详细信息，包括基本信息、性格、技能、关系和AI模型等
 * 
 * @param {Object} props
 * @param {string} props.agentId - 角色ID
 * @param {Function} props.onClose - 关闭回调
 */
const CharacterDetailEditor = ({ agentId, onClose }) => {
  const [agent, setAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [llmConfigs, setLlmConfigs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);
  
  // 加载LLM配置
  useEffect(() => {
    try {
      const savedConfigs = localStorage.getItem('llm_configs');
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        setLlmConfigs(configs);
      } else {
        setLlmConfigs([]);
      }
    } catch (error) {
      console.error('加载LLM配置失败:', error, error.stack);
      message.error('加载LLM配置失败');
    }
  }, []);

  // 加载角色数据
  useEffect(() => {
    if (agentId) {
      setLoading(true);
      try {
        const agentData = agentRegistry.get(agentId);
        
        // 检查agentData是否存在
        if (!agentData) {
          console.error(`找不到ID为 ${agentId} 的角色数据`);
          message.error('找不到角色数据');
          onClose(false);
          return;
        }
        
        // 确保personality是对象
        const personality = typeof agentData.personality === 'object' ? 
          agentData.personality : 
          {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 50
          };
        
        // 确保llmConfig是对象
        const defaultLLMConfig = {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2000
        };
        
        const llmConfig = agentData.llmConfig || defaultLLMConfig;
        
        // 如果有LLM配置，设置选中的LLM
        if (llmConfig && llmConfig.configId) {
          setSelectedLLM(llmConfig.configId);
        }
        
        setAgent({ 
          ...agentData,
          skills: Array.isArray(agentData.skills) ? agentData.skills : [],
          relationships: Array.isArray(agentData.relationships) ? agentData.relationships : [],
          behaviorTags: Array.isArray(agentData.behaviorTags) ? agentData.behaviorTags : [],
          personality: personality,
          llmConfig: llmConfig
        });
        
      } catch (error) {
        console.error(`加载角色数据错误:`, error, error.stack, `agentId: ${agentId}`);
        message.error('加载角色数据失败');
        onClose(false);
      } finally {
        setLoading(false);
      }
    }
  }, [agentId, onClose]);
  
  // 保存角色数据
  const saveAgent = () => {
    if (agent) {
      try {
        // 检查角色是否已存在，如果存在则使用update方法，否则使用register方法
        if (agentRegistry.get(agent.id)) {
          agentRegistry.update(agent.id, agent);
        } else {
          agentRegistry.register(agent);
        }
        message.success('角色数据已保存');
        onClose(true); // 关闭并刷新列表
      } catch (error) {
        console.error('保存角色数据失败:', error);
        message.error(`保存失败: ${error.message}`);
      }
    }
  };
  
  // 更新基本信息
  const updateBasicInfo = (key, value) => {
    setAgent(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // 更新性格属性
  const updatePersonality = (trait, value) => {
    setAgent(prev => ({
      ...prev,
      personality: {
        ...prev.personality,
        [trait]: value
      }
    }));
  };
  
  // 添加技能
  const addSkill = () => {
    const newSkill = { name: '', level: 1, description: '' };
    setAgent(prev => ({
      ...prev,
      skills: [...prev.skills, newSkill]
    }));
  };
  
  // 更新技能
  const updateSkill = (index, key, value) => {
    setAgent(prev => {
      const newSkills = [...prev.skills];
      newSkills[index] = {
        ...newSkills[index],
        [key]: key === 'level' ? parseInt(value, 10) : value
      };
      return {
        ...prev,
        skills: newSkills
      };
    });
  };
  
  // 删除技能
  const deleteSkill = (index) => {
    setAgent(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };
  
  // 更新LLM配置
  const handleLLMConfigChange = (configId) => {
    // 找到选中的LLM配置
    const selectedConfig = llmConfigs.find(config => config.id === configId);
    
    if (selectedConfig) {
      setSelectedLLM(configId);
      
      // 更新角色的LLM配置，但不包含敏感信息如API密钥
      setAgent({
        ...agent,
        llmConfig: {
          configId: selectedConfig.id,
          provider: selectedConfig.provider,
          model: selectedConfig.model,
          temperature: agent.llmConfig?.temperature || 0.7,
          maxTokens: agent.llmConfig?.maxTokens || 2000
        }
      });
      
      message.success(`已选择 ${selectedConfig.name} 作为角色的AI模型`);
    } else {
      message.error('找不到选中的LLM配置');
    }
  };
  
  // 导出角色数据
  const exportCharacter = () => {
    try {
      if (!agent) {
        message.error('没有角色数据可导出');
        return;
      }

      // 创建导出对象，移除敏感信息
      const exportData = {
        ...agent,
        llmConfig: {
          ...agent.llmConfig,
          apiKey: '' // 不导出API密钥
        }
      };

      // 转换为JSON并下载
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `character-${agent.name}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success('角色数据已导出');
    } catch (error) {
      console.error('导出角色失败:', error);
      message.error('导出角色失败: ' + error.message);
    }
  };
  
  // 获取角色类型对应的图标
  const getTypeIcon = (type) => {
    switch (type) {
      case 'player':
        return <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
      case 'gm':
        return <RobotOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
      case 'npc':
      default:
        return <TeamOutlined style={{ fontSize: 24, color: '#faad14' }} />;
    }
  };
  
  // 获取角色类型标签
  const getTypeTag = (type) => {
    switch (type) {
      case 'player':
        return <Tag color="blue">玩家角色</Tag>;
      case 'gm':
        return <Tag color="green">游戏主持人</Tag>;
      case 'npc':
      default:
        return <Tag color="orange">NPC</Tag>;
    }
  };

  // 如果没有加载角色数据，显示加载中
  if (loading || !agent) {
    return <div style={{ textAlign: 'center', padding: '40px 0' }}>加载中...</div>;
  }
  
  return (
    <div className="character-detail-editor">
      <div className="character-header" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Avatar 
              size={64} 
              icon={getTypeIcon(agent.type)}
              style={{ 
                backgroundColor: agent.type === 'player' ? '#e6f7ff' : 
                                (agent.type === 'gm' ? '#f6ffed' : '#fff7e6') 
              }}
            />
          </Col>
          <Col>
            <Title level={3} style={{ margin: 0 }}>{agent.name}</Title>
            <Space size="small">
              {getTypeTag(agent.type)}
              {agent.role && <Tag color="purple">{agent.role}</Tag>}
            </Space>
          </Col>
        </Row>
      </div>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 基本信息标签页 */}
        <TabPane tab="基本信息" key="basic">
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="角色名称">
                  <Input 
                    value={agent.name} 
                    onChange={(e) => updateBasicInfo('name', e.target.value)}
                    placeholder="输入角色名称"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="角色类型">
                  <Select
                    value={agent.type}
                    onChange={(value) => updateBasicInfo('type', value)}
                  >
                    <Option value="player">玩家角色</Option>
                    <Option value="gm">游戏主持人</Option>
                    <Option value="npc">NPC</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="性别">
                  <Input 
                    value={agent.gender || ''} 
                    onChange={(e) => updateBasicInfo('gender', e.target.value)}
                    placeholder="输入角色性别"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="年龄">
                  <Input 
                    type="number"
                    value={agent.age || ''} 
                    onChange={(e) => updateBasicInfo('age', e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="输入角色年龄"
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item label="角色职业/身份">
              <Input 
                value={agent.role || ''} 
                onChange={(e) => updateBasicInfo('role', e.target.value)}
                placeholder="输入角色职业或身份"
              />
            </Form.Item>
            
            <Form.Item label="角色描述">
              <TextArea 
                value={agent.description || ''} 
                onChange={(e) => updateBasicInfo('description', e.target.value)}
                placeholder="详细描述这个角色"
                rows={4}
              />
            </Form.Item>
            
            <Form.Item label="背景故事">
              <TextArea 
                value={agent.background || ''} 
                onChange={(e) => updateBasicInfo('background', e.target.value)}
                placeholder="角色的背景故事"
                rows={6}
              />
            </Form.Item>
          </Form>
        </TabPane>
        
        {/* 性格标签页 */}
        <TabPane tab="性格" key="personality">
          <div className="personality-sliders">
            <Divider orientation="left">大五人格模型</Divider>
            <p style={{ marginBottom: 16 }}>通过调整以下五个维度的值来定义角色的性格特征</p>
            
            <Form layout="vertical">
              <Form.Item 
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>开放性 (Openness)</span>
                    <span>{agent.personality.openness}%</span>
                  </div>
                }
                tooltip="开放性高的人更具创造力、好奇心和开放思想；低的人则更传统、实际"
              >
                <Slider 
                  value={agent.personality.openness} 
                  onChange={(value) => updatePersonality('openness', value)}
                  min={0}
                  max={100}
                />
              </Form.Item>
              
              <Form.Item 
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>尽责性 (Conscientiousness)</span>
                    <span>{agent.personality.conscientiousness}%</span>
                  </div>
                }
                tooltip="尽责性高的人更有条理、自律和负责任；低的人则更随性、灵活"
              >
                <Slider 
                  value={agent.personality.conscientiousness} 
                  onChange={(value) => updatePersonality('conscientiousness', value)}
                  min={0}
                  max={100}
                />
              </Form.Item>
              
              <Form.Item 
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>外向性 (Extraversion)</span>
                    <span>{agent.personality.extraversion}%</span>
                  </div>
                }
                tooltip="外向性高的人更健谈、活跃和寻求刺激；低的人则更安静、内敛"
              >
                <Slider 
                  value={agent.personality.extraversion} 
                  onChange={(value) => updatePersonality('extraversion', value)}
                  min={0}
                  max={100}
                />
              </Form.Item>
              
              <Form.Item 
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>亲和性 (Agreeableness)</span>
                    <span>{agent.personality.agreeableness}%</span>
                  </div>
                }
                tooltip="亲和性高的人更友善、合作和富有同情心；低的人则更具竞争性、直接"
              >
                <Slider 
                  value={agent.personality.agreeableness} 
                  onChange={(value) => updatePersonality('agreeableness', value)}
                  min={0}
                  max={100}
                />
              </Form.Item>
              
              <Form.Item 
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>神经质 (Neuroticism)</span>
                    <span>{agent.personality.neuroticism}%</span>
                  </div>
                }
                tooltip="神经质高的人更容易焦虑、情绪波动；低的人则更稳定、冷静"
              >
                <Slider 
                  value={agent.personality.neuroticism} 
                  onChange={(value) => updatePersonality('neuroticism', value)}
                  min={0}
                  max={100}
                />
              </Form.Item>
            </Form>
            
            <Divider orientation="left">性格标签</Divider>
            <p style={{ marginBottom: 16 }}>添加描述角色性格的标签（待实现）</p>
          </div>
        </TabPane>
        
        {/* 技能标签页 */}
        <TabPane tab="技能" key="skills">
          <div className="skills-editor">
            <Divider orientation="left">角色技能</Divider>
            <p style={{ marginBottom: 16 }}>添加角色拥有的技能和专长</p>
            
            {agent.skills.map((skill, index) => (
              <div key={index} className="skill-item" style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                  <Col span={8}>
                    <Form.Item label="技能名称" style={{ marginBottom: 0 }}>
                      <Input 
                        value={skill.name} 
                        onChange={(e) => updateSkill(index, 'name', e.target.value)}
                        placeholder="技能名称"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item label="等级 (1-10)" style={{ marginBottom: 0 }}>
                      <Select
                        value={skill.level}
                        onChange={(value) => updateSkill(index, 'level', value)}
                      >
                        {[...Array(10)].map((_, i) => (
                          <Option key={i+1} value={i+1}>{i+1}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label="描述" style={{ marginBottom: 0 }}>
                      <Input 
                        value={skill.description || ''} 
                        onChange={(e) => updateSkill(index, 'description', e.target.value)}
                        placeholder="技能描述"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={2} style={{ textAlign: 'center' }}>
                    <Button 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => deleteSkill(index)}
                      style={{ marginTop: 24 }}
                    />
                  </Col>
                </Row>
              </div>
            ))}
            
            <Button 
              type="dashed" 
              onClick={addSkill} 
              block 
              icon={<PlusOutlined />}
              style={{ marginTop: 16 }}
            >
              添加技能
            </Button>
          </div>
        </TabPane>
        
        {/* 关系标签页 */}
        <TabPane tab="关系" key="relationships">
          <div className="relationships-editor">
            <Divider orientation="left">角色关系</Divider>
            <p style={{ marginBottom: 16 }}>管理与其他角色的关系（待实现）</p>
          </div>
        </TabPane>
        
        {/* AI模型标签页 */}
        <TabPane tab="AI模型" key="llm">
          <Card title="AI模型配置" bordered={false}>
            <Paragraph>
              为该角色选择一个预配置的AI模型。您可以在LLM管理页面添加和管理模型配置。
            </Paragraph>
            
            {llmConfigs.length === 0 ? (
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <Alert
                  message="未找到LLM配置"
                  description="请先在LLM管理页面添加至少一个模型配置"
                  type="warning"
                  showIcon
                />
              </div>
            ) : (
              <Form layout="vertical">
                <Form.Item 
                  label={(
                    <span>
                      选择AI模型
                      <Tooltip title="选择一个预配置的LLM模型作为该角色的AI引擎">
                        <InfoCircleOutlined style={{ marginLeft: 8 }} />
                      </Tooltip>
                    </span>
                  )}
                >
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择一个模型配置"
                    value={selectedLLM}
                    onChange={handleLLMConfigChange}
                  >
                    {llmConfigs.map(config => (
                      <Option key={config.id} value={config.id}>
                        <Space>
                          {config.name}
                          <Tag color="blue">{config.provider}</Tag>
                          <Tag color="green">{config.model}</Tag>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Divider />
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      label={(
                        <span>
                          温度
                          <Tooltip title="控制生成文本的随机性。设置较高的值会使输出更加多样化和创造性，较低的值会使输出更加聚焦和确定性">
                            <InfoCircleOutlined style={{ marginLeft: 8 }} />
                          </Tooltip>
                        </span>
                      )}
                    >
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={agent.llmConfig.temperature}
                        onChange={(value) => updateBasicInfo('llmConfig', { ...agent.llmConfig, temperature: value })}
                        marks={{
                          0: '确定性',
                          0.5: '平衡',
                          1: '创造性'
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      label={(
                        <span>
                          最大输出长度
                          <Tooltip title="控制模型生成的最大标记数量">
                            <InfoCircleOutlined style={{ marginLeft: 8 }} />
                          </Tooltip>
                        </span>
                      )}
                    >
                      <InputNumber
                        min={100}
                        max={4000}
                        step={100}
                        style={{ width: '100%' }}
                        value={agent.llmConfig.maxTokens}
                        onChange={(value) => updateBasicInfo('llmConfig', { ...agent.llmConfig, maxTokens: value })}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            )}
          </Card>
        </TabPane>
        
        {/* 导入/导出标签页 */}
        <TabPane tab="导入/导出" key="export">
          <div className="export-import">
            <Divider orientation="left">角色数据导出</Divider>
            <p style={{ marginBottom: 16 }}>导出角色数据为JSON格式，方便备份和分享</p>
            
            <Button 
              type="primary" 
              icon={<ExportOutlined />} 
              onClick={exportCharacter}
            >
              导出角色数据
            </Button>
            
            <Divider orientation="left" style={{ marginTop: 32 }}>注意事项</Divider>
            <ul>
              <li>导出的数据不包含API密钥等敏感信息</li>
              <li>导入时会自动生成新的角色ID，避免与现有角色冲突</li>
              <li>建议定期导出角色数据进行备份</li>
            </ul>
          </div>
        </TabPane>
      </Tabs>
      
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={() => onClose(false)}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={saveAgent}>保存</Button>
        </Space>
      </div>
    </div>
  );
};

export default CharacterDetailEditor;
