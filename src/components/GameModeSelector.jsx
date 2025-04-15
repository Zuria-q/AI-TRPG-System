import React, { useState, useEffect } from 'react';
import { Radio, Card, Alert, Switch, Space, Typography, Divider } from 'antd';
import { UserOutlined, RobotOutlined, InfoCircleOutlined } from '@ant-design/icons';
import agentRegistry from '../agent_registry';

const { Title, Text, Paragraph } = Typography;

/**
 * 游戏模式选择器组件，用于切换有无玩家模式
 */
const GameModeSelector = () => {
  // 当前是否有玩家角色
  const [hasPlayerCharacter, setHasPlayerCharacter] = useState(true);
  
  // 初始化时从agentRegistry获取当前模式
  useEffect(() => {
    if (typeof agentRegistry.getPlayerMode === 'function') {
      setHasPlayerCharacter(agentRegistry.getPlayerMode());
    }
  }, []);
  
  // 切换游戏模式
  const handleModeChange = (checked) => {
    try {
      if (typeof agentRegistry.setPlayerMode === 'function') {
        const result = agentRegistry.setPlayerMode(checked);
        setHasPlayerCharacter(result);
      } else {
        console.error('agentRegistry.setPlayerMode 方法不存在');
      }
    } catch (error) {
      console.error('切换游戏模式失败:', error);
    }
  };
  
  return (
    <Card title="游戏模式设置" className="game-mode-selector">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={4}>当前模式</Title>
        <Radio.Group 
          value={hasPlayerCharacter ? 'player' : 'no-player'} 
          onChange={(e) => handleModeChange(e.target.value === 'player')}
          buttonStyle="solid"
          style={{ marginBottom: 16 }}
        >
          <Radio.Button value="player">
            <UserOutlined /> 有玩家模式
          </Radio.Button>
          <Radio.Button value="no-player">
            <RobotOutlined /> 无玩家模式
          </Radio.Button>
        </Radio.Group>
        
        <Divider />
        
        <Alert
          message="模式说明"
          description={
            <div>
              <Paragraph>
                <strong>有玩家模式：</strong> 你将控制一个玩家角色参与游戏，与NPC和GM互动。
              </Paragraph>
              <Paragraph>
                <strong>无玩家模式：</strong> 所有角色都由AI控制，你作为旁观者可以通过旁白影响剧情走向。
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
        
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            注意：切换模式会影响角色卡和对话界面的行为。在无玩家模式下，你可以通过旁白来引导故事发展。
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default GameModeSelector;
