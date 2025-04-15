import React, { useState, useEffect } from 'react';
import { Select, Button, Card, message, Tabs, Empty } from 'antd';
import { PlusOutlined, UserOutlined, RobotOutlined, TeamOutlined } from '@ant-design/icons';
import CharacterEditor from './CharacterEditor';
import agentRegistry from '../agent_registry';

const { Option } = Select;
const { TabPane } = Tabs;

/**
 * 角色卡编辑面板组件
 * 专门用于管理和编辑所有角色卡，包括玩家角色和GM角色
 */
const CharacterEditorPanel = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents, setAgents] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  
  // 加载所有角色数据
  useEffect(() => {
    if (agentRegistry && typeof agentRegistry.getAllAgents === 'function') {
      try {
        const allAgents = agentRegistry.getAllAgents() || {};
        setAgents(allAgents);
        
        // 如果没有选中角色，默认选择第一个
        if (!selectedAgent && Object.keys(allAgents).length > 0) {
          setSelectedAgent(Object.keys(allAgents)[0]);
        }
      } catch (error) {
        console.error('加载角色数据失败:', error);
        message.error('加载角色数据失败');
      }
    }
  }, [selectedAgent]);
  
  // 创建新角色
  const handleCreateCharacter = (type = 'npc') => {
    if (agentRegistry && typeof agentRegistry.createAgent === 'function') {
      try {
        // 确保创建时personality是对象而不是字符串
        const newAgent = agentRegistry.createAgent({
          id: `agent_${Date.now()}`,
          name: type === 'player' ? '新玩家角色' : (type === 'gm' ? '新主持人角色' : '新NPC角色'),
          type: type,
          description: type === 'player' ? '由玩家控制的角色' : 
                      (type === 'gm' ? '负责推进故事的主持人' : '游戏中的NPC角色'),
          personality: {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 50
          },
          location: 'start',
          skills: [],
          relationships: [],
          llmConfig: {
            provider: 'openai',
            model: 'gpt-4o',
            apiKey: '',
            temperature: 0.7,
            maxTokens: 2000
          }
        });
        
        if (typeof agentRegistry.register === 'function') {
          agentRegistry.register(newAgent);
          setSelectedAgent(newAgent.id);
          message.success('新角色已创建');
          
          // 刷新角色列表
          if (typeof agentRegistry.getAllAgents === 'function') {
            setAgents(agentRegistry.getAllAgents() || {});
          }
        }
      } catch (error) {
        console.error('创建角色失败:', error);
        message.error('创建角色失败: ' + error.message);
      }
    }
  };
  
  // 根据类型过滤角色
  const getFilteredAgents = (type) => {
    if (type === 'all') {
      return agents;
    }
    
    const filtered = {};
    Object.entries(agents).forEach(([id, agent]) => {
      if (agent.type === type) {
        filtered[id] = agent;
      }
    });
    
    return filtered;
  };
  
  // 渲染角色选择器
  const renderAgentSelector = (filteredAgents) => {
    return (
      <div className="flex items-center mb-4">
        <Select
          style={{ width: 250 }}
          placeholder="选择角色"
          onChange={(value) => setSelectedAgent(value)}
          value={selectedAgent}
          showSearch
          optionFilterProp="children"
        >
          {Object.values(filteredAgents).map(agent => (
            <Option key={agent.id} value={agent.id}>
              {agent.type === 'player' ? <UserOutlined /> : 
               agent.type === 'gm' ? <RobotOutlined /> : <TeamOutlined />} {agent.name}
            </Option>
          ))}
        </Select>
      </div>
    );
  };
  
  // 渲染创建角色按钮
  const renderCreateButtons = (type) => {
    if (type === 'all') {
      return (
        <div className="flex mb-4">
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleCreateCharacter('player')}
            style={{ marginRight: 8 }}
          >
            创建玩家角色
          </Button>
          <Button 
            type="default" 
            icon={<PlusOutlined />}
            onClick={() => handleCreateCharacter('gm')}
            style={{ marginRight: 8 }}
          >
            创建GM角色
          </Button>
          <Button 
            type="dashed" 
            icon={<PlusOutlined />}
            onClick={() => handleCreateCharacter('npc')}
          >
            创建NPC
          </Button>
        </div>
      );
    } else {
      return (
        <div className="mb-4">
          <Button 
            type={type === 'player' ? 'primary' : (type === 'gm' ? 'default' : 'dashed')} 
            icon={<PlusOutlined />}
            onClick={() => handleCreateCharacter(type)}
          >
            创建{type === 'player' ? '玩家角色' : (type === 'gm' ? 'GM角色' : 'NPC')}
          </Button>
        </div>
      );
    }
  };
  
  // 渲染不同类型的角色列表
  const renderAgentList = (type) => {
    const filteredAgents = getFilteredAgents(type);
    const agentCount = Object.keys(filteredAgents).length;
    
    return (
      <div>
        {renderCreateButtons(type)}
        
        {agentCount > 0 ? (
          <div>
            {renderAgentSelector(filteredAgents)}
            
            {selectedAgent && agents[selectedAgent] && (
              <CharacterEditor agentId={selectedAgent} />
            )}
          </div>
        ) : (
          <Empty 
            description={`没有${type === 'player' ? '玩家角色' : (type === 'gm' ? 'GM角色' : 'NPC')}，请创建一个`} 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    );
  };
  
  return (
    <Card title="角色卡管理" className="character-editor-panel">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="所有角色" key="all">
          {renderAgentList('all')}
        </TabPane>
        <TabPane tab="玩家角色" key="player">
          {renderAgentList('player')}
        </TabPane>
        <TabPane tab="GM角色" key="gm">
          {renderAgentList('gm')}
        </TabPane>
        <TabPane tab="NPC" key="npc">
          {renderAgentList('npc')}
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default CharacterEditorPanel;
