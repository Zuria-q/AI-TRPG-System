import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Avatar, List, Select, Tabs, Tooltip, Divider, message, Typography, Space, Alert, Spin } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, ToolOutlined, ShoppingOutlined, HistoryOutlined, CommentOutlined, ThunderboltOutlined, BookOutlined } from '@ant-design/icons';
import agentRegistry from '../agent_registry';
import gameState from '../modules/game_state';
import gmAgent from '../modules/gm_agent';
import npcAgent from '../modules/npc_agent';
import promptBuilder from '../modules/prompt_builder';
import '../styles/dialogue.css';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

/**
 * 对话界面组件
 * 实现类似聊天界面的TRPG体验
 * 支持故事开场加载、玩家行动和NPC响应
 */
function DialogueInterface() {
  // 状态
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [actionType, setActionType] = useState('DIALOGUE');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [storyLoading, setStoryLoading] = useState(false);
  const [worldSettings, setWorldSettings] = useState(null);
  
  // 引用
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // 加载角色数据和游戏状态
  useEffect(() => {
    try {
      // 加载角色数据
      const allAgents = agentRegistry.getAllAgents() || {};
      const agentList = Object.values(allAgents);
      setAgents(agentList);
      
      // 如果有玩家角色，默认选择玩家
      const playerAgent = agentList.find(agent => agent.type === 'player');
      if (playerAgent) {
        setSelectedAgent(playerAgent);
      } else if (agentList.length > 0) {
        setSelectedAgent(agentList[0]);
      }
      
      // 加载游戏状态
      const state = gameState.getState();
      setWorldSettings(state.world || {});
      
      // 检查是否有历史消息
      if (state.messages && state.messages.length > 0) {
        setMessages(state.messages.slice(-50)); // 只显示最近50条消息
        setHistoryMessages(state.messages);
        setGameStarted(true);
      } else {
        // 如果没有消息历史，尝试从本地存储加载
        const savedMessages = localStorage.getItem('dialogue_history');
        if (savedMessages) {
          try {
            const parsedMessages = JSON.parse(savedMessages);
            setMessages(parsedMessages.slice(-50));
            setHistoryMessages(parsedMessages);
            setGameStarted(parsedMessages.length > 0);
          } catch (error) {
            console.error('加载历史消息失败:', error, error.stack);
          }
        }
      }
      
      // 初始GM代理
      gmAgent.initialize();
      npcAgent.initialize();
    } catch (error) {
      console.error('加载游戏数据失败:', error, error.stack);
      message.error('加载游戏数据失败');
    }
  }, []);
  
  // 保存消息历史
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const allMessages = [...historyMessages];
        
        // 找出新消息并添加到历史记录
        const newMessages = messages.filter(msg => 
          !historyMessages.some(hMsg => 
            hMsg.id === msg.id
          )
        );
        
        if (newMessages.length > 0) {
          allMessages.push(...newMessages);
          setHistoryMessages(allMessages);
          localStorage.setItem('dialogue_history', JSON.stringify(allMessages));
        }
      } catch (error) {
        console.error('保存历史消息失败:', error);
      }
    }
  }, [messages]);
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 加载故事开场
  const loadStoryOpening = async () => {
    if (gameStarted) return;
    
    setStoryLoading(true);
    try {
      // 获取世界设定
      const world = worldSettings || gameState.getWorldSettings();
      
      if (!world || !world.background) {
        message.warning('缺少世界设定信息，请先在世界观设定页面进行配置');
        setStoryLoading(false);
        return;
      }
      
      // 生成开场白
      const openingMessage = await gmAgent.generateOpening(world);
      
      // 添加到消息列表
      setMessages([openingMessage]);
      setHistoryMessages([openingMessage]);
      
      // 保存到游戏状态
      gameState.updateState({
        messages: [openingMessage],
        lastUpdateTime: Date.now()
      });
      
      setGameStarted(true);
      message.success('故事已开始，请输入你的行动');
    } catch (error) {
      console.error('加载故事开场失败:', error, error.stack);
      message.error('加载故事开场失败: ' + error.message);
    } finally {
      setStoryLoading(false);
    }
  };
  
  // 发送玩家消息
  const sendPlayerMessage = async () => {
    if (!inputText.trim() || !selectedAgent || !gameStarted) return;
    
    // 检查是否是玩家角色
    if (selectedAgent.type !== 'player') {
      message.warning('只能以玩家角色发送消息');
      return;
    }
    
    setLoading(true);
    
    try {
      // 创建玩家消息对象
      const playerMessage = {
        id: `msg_${Date.now()}_player`,
        text: inputText,
        sender: selectedAgent.id,
        senderName: selectedAgent.name,
        type: 'PLAYER_ACTION',
        timestamp: new Date().toISOString()
      };
      
      // 添加到消息列表
      setMessages(prev => [...prev, playerMessage]);
      setInputText('');
      
      // 处理玩家输入，生成NPC响应
      const responses = await gmAgent.handlePlayerInput(playerMessage);
      
      // 添加NPC响应到消息列表
      if (responses && responses.length > 0) {
        setMessages(prev => [...prev, ...responses]);
      }
      
      // 更新历史消息
      const updatedHistory = [...historyMessages, playerMessage, ...responses];
      setHistoryMessages(updatedHistory);
      
      // 保存到游戏状态
      gameState.updateState({
        messages: updatedHistory,
        lastPlayerAction: playerMessage,
        lastUpdateTime: Date.now()
      });
      
      // 保存到本地存储
      localStorage.setItem('dialogue_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('处理玩家输入失败:', error, error.stack);
      message.error('处理玩家输入失败: ' + error.message);
    } finally {
      setLoading(false);
      // 聚焦输入框
      inputRef.current?.focus();
    }
  };
  
  // 发送消息（兼容旧版本）
  const sendMessage = async () => {
    if (selectedAgent?.type === 'player') {
      sendPlayerMessage();
    } else {
      // 非玩家角色发送消息（模拟模式）
      if (!inputText.trim() || !selectedAgent) return;
      
      // 创建消息对象
      const newMessage = {
        id: `msg_${Date.now()}`,
        text: inputText,
        sender: selectedAgent.id,
        senderName: selectedAgent.name,
        type: 'NPC_DIALOGUE',
        timestamp: new Date().toISOString()
      };
      
      // 添加到消息列表
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      
      // 模拟系统响应
      setLoading(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const responseMessage = {
          id: `msg_${Date.now()}_system`,
          text: `【系统提示】当前为模拟模式，你以${selectedAgent.name}的身份发送了消息。在正式游戏中，NPC将由AI自动控制。`,
          sender: 'system',
          senderName: '系统',
          type: 'SYSTEM',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, responseMessage]);
      } catch (error) {
        console.error('生成回复失败:', error, error.stack);
      } finally {
        setLoading(false);
      }
    }
    
    // 聚焦输入框
    inputRef.current?.focus();
  };
  
  // 处理按键事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!gameStarted) {
        loadStoryOpening();
      } else {
        sendMessage();
      }
    }
  };
  
  // 渲染消息项
  const renderMessageItem = (msg) => {
    const isPlayer = msg.sender === 'player' || msg.type === 'PLAYER_ACTION';
    const isSystem = msg.sender === 'system' || msg.type === 'SYSTEM';
    const isGM = msg.sender === 'gm' || msg.type === 'GM_NARRATION';
    const isNPC = !isPlayer && !isSystem && !isGM;
    
    let avatarIcon = <RobotOutlined />;
    let avatarColor = '#1890ff';
    
    if (isPlayer) {
      avatarIcon = <UserOutlined />;
      avatarColor = '#52c41a';
    } else if (isSystem) {
      avatarIcon = <ToolOutlined />;
      avatarColor = '#faad14';
    } else if (isGM) {
      avatarIcon = <BookOutlined />;
      avatarColor = '#722ed1';
    }
    
    // 根据消息类型设置样式
    let messageStyle = {};
    let actionLabel = '';
    
    switch (msg.type) {
      case 'PLAYER_ACTION':
        actionLabel = '玩家';
        messageStyle.backgroundColor = '#f0f5ff';
        break;
      case 'NPC_RESPONSE':
      case 'NPC_DIALOGUE':
        actionLabel = 'NPC';
        messageStyle.backgroundColor = '#e6fffb';
        break;
      case 'GM_NARRATION':
        actionLabel = '主持人';
        messageStyle.backgroundColor = '#f9f0ff';
        break;
      case 'SYSTEM':
        actionLabel = '系统';
        messageStyle.backgroundColor = '#fffbe6';
        break;
      default:
        actionLabel = '消息';
    }
    
    // 处理消息文本格式化
    const formatMessageText = (text) => {
      if (!text) return '';
      
      // 将【】内的内容转换为环境描述格式
      let formattedText = text.replace(/【([^】]+)】/g, '<div class="environment-description">$1</div>');
      
      // 将“”内的内容转换为对话格式
      formattedText = formattedText.replace(/“([^”]+)”/g, '<div class="dialogue-text">"$1"</div>');
      
      // 将（）内的内容转换为思考格式
      formattedText = formattedText.replace(/（([^）]+)）/g, '<div class="thought-text">($1)</div>');
      formattedText = formattedText.replace(/\(([^\)]+)\)/g, '<div class="thought-text">($1)</div>');
      
      return formattedText;
    };
    
    return (
      <List.Item style={{ padding: '8px 16px' }}>
        <List.Item.Meta
          avatar={
            <Avatar 
              icon={avatarIcon} 
              style={{ backgroundColor: avatarColor }}
            />
          }
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Text strong>{msg.senderName}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {actionLabel}
              </Text>
            </div>
          }
          description={
            <div style={{ ...messageStyle, padding: '8px', borderRadius: '4px' }}>
              <div dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }} />
            </div>
          }
        />
      </List.Item>
    );
  };
  
  // 渲染历史记录模态框
  const renderHistoryTab = () => {
    // 按日期分组历史消息
    const groupedMessages = {};
    
    historyMessages.forEach(msg => {
      const date = new Date(msg.timestamp).toLocaleDateString();
      if (!groupedMessages[date]) {
        groupedMessages[date] = [];
      }
      groupedMessages[date].push(msg);
    });
    
    return (
      <div style={{ height: '400px', overflowY: 'auto' }}>
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <Divider orientation="left">{date}</Divider>
            <List
              itemLayout="horizontal"
              dataSource={msgs}
              renderItem={renderMessageItem}
            />
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="dialogue-interface">
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>对话界面</span>
            <Space>
              {!gameStarted && (
                <Button 
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={loadStoryOpening}
                  loading={storyLoading}
                >
                  开始故事
                </Button>
              )}
              <Button 
                icon={<HistoryOutlined />}
                onClick={() => setHistoryVisible(!historyVisible)}
              >
                历史记录
              </Button>
            </Space>
          </div>
        }
        bodyStyle={{ 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          height: 'calc(100vh - 200px)' 
        }}
      >
        <Tabs defaultActiveKey="chat" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TabPane tab="聊天" key="chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 消息列表 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
              {messages.length > 0 ? (
                <List
                  itemLayout="horizontal"
                  dataSource={messages}
                  renderItem={renderMessageItem}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  {!gameStarted ? (
                    <div>
                      <div style={{ marginBottom: '20px' }}>
                        <Text type="secondary">点击“开始故事”按钮来开始你的冒险！</Text>
                      </div>
                      <Button 
                        type="primary" 
                        icon={<ThunderboltOutlined />} 
                        onClick={loadStoryOpening}
                        loading={storyLoading}
                      >
                        开始故事
                      </Button>
                    </div>
                  ) : (
                    <Text type="secondary">还没有消息，开始你的冒险吧！</Text>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* 输入区域 */}
            <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
              {gameStarted ? (
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <Select
                    value={selectedAgent?.id}
                    onChange={(value) => {
                      const agent = agents.find(a => a.id === value);
                      setSelectedAgent(agent);
                    }}
                    style={{ width: '150px' }}
                    disabled={loading}
                  >
                    {agents.filter(agent => agent.type === 'player').map(agent => (
                      <Option key={agent.id} value={agent.id}>
                        {agent.name} (玩家)
                      </Option>
                    ))}
                    {agents.filter(agent => agent.type !== 'player').map(agent => (
                      <Option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.type === 'gm' ? '主持人' : 'NPC'})
                      </Option>
                    ))}
                  </Select>
                  
                  <Select
                    value={actionType}
                    onChange={setActionType}
                    style={{ width: '120px' }}
                    disabled={loading}
                  >
                    <Option value="DIALOGUE">
                      <Space><CommentOutlined /> 对话</Space>
                    </Option>
                    <Option value="ACTION">
                      <Space><ThunderboltOutlined /> 行动</Space>
                    </Option>
                    <Option value="ITEM">
                      <Space><ShoppingOutlined /> 物品</Space>
                    </Option>
                  </Select>
                </div>
              ) : (
                <Alert
                  message="游戏未开始"
                  description="点击上方的“开始故事”按钮来开始游戏"
                  type="info"
                  showIcon
                  style={{ marginBottom: '10px' }}
                />
              )}
              
              <div style={{ display: 'flex' }}>
                <TextArea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={gameStarted ? 
                    (selectedAgent?.type === 'player' ? "输入你的行动或对话..." : "模拟模式: 输入NPC的对话...") : 
                    "点击开始故事按钮来开始游戏"}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  style={{ flex: 1, marginRight: '8px' }}
                  disabled={!gameStarted || loading || storyLoading}
                />
                {gameStarted ? (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={sendMessage}
                    loading={loading}
                    style={{ height: 'auto' }}
                    disabled={!inputText.trim() || storyLoading}
                  >
                    发送
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={loadStoryOpening}
                    loading={storyLoading}
                    style={{ height: 'auto' }}
                  >
                    开始故事
                  </Button>
                )}
              </div>
              
              {loading && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <Spin tip="正在生成响应..." />
                </div>
              )}
            </div>
          </TabPane>
          
          {historyVisible && (
            <TabPane tab="历史记录" key="history">
              {renderHistoryTab()}
            </TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  );
}

export default DialogueInterface;
