import React, { useState, useEffect } from 'react';
import { memoryStore, gameState, agentRegistry } from '@/modules/index';

// 导入实际组件
import GameControlPanel from './GameControlPanel';
import WorldCardPanel from './WorldCardPanel';
import TRPGActionPanel from './TRPGActionPanel';
import gameController from './game_controller';

/**
 * 游戏主容器
 * 集成所有核心模块和UI面板
 */
export default function Game() {
  const [currentView, setCurrentView] = useState('game'); // game | worldbook
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [gameStatus, setGameStatus] = useState('ready'); // ready | playing | ended
  const [gameHistory, setGameHistory] = useState({
    id: `game_${Date.now()}`,
    title: 'AI-TRPG 冒险',
    messages: [],
    characters: [],
    currentLocation: 'start',
    startTime: Date.now()
  })
  
  // 初始化游戏
  // 记忆系统配置
  const [memoryConfig, setMemoryConfig] = useState({
    maxMemories: 3,
    recencyWeight: 0.6,
    relevanceThreshold: 0.5
  });
  
  // 初始化游戏状态
  const initializeGameState = () => {
    try {
      // 初始化游戏状态
      if (gameState && typeof gameState.initializeState === 'function') {
        gameState.initializeState({
          world: {
            name: '未知世界',
            description: '一个神秘的世界等待探索...',
            time: 'day',
            weather: 'clear',
            currentLocation: 'start',
            locations: {
              start: {
                id: 'start',
                name: '起始位置',
                description: '游戏开始的地方',
                exits: ['town']
              },
              town: {
                id: 'town',
                name: '小镇',
                description: '一个安静的小镇',
                exits: ['start']
              }
            }
          }
        });
      }
      
      // 初始化角色注册表
      if (agentRegistry && typeof agentRegistry.createAgent === 'function') {
        // 创建玩家角色
        const playerAgent = agentRegistry.createAgent({
          id: 'player',
          name: '玩家',
          type: 'player',
          description: '游戏主角',
          personality: '勇敢、好奇',
          location: 'start'
        });
        
        // 创建 NPC
        const npc1 = agentRegistry.createAgent({
          id: 'npc1',
          name: '小镇长',
          type: 'npc',
          description: '小镇的镇长，知识渊博',
          personality: '和薄、智慧',
          location: 'town'
        });
        
        // 注册角色
        if (typeof agentRegistry.register === 'function') {
          agentRegistry.register(playerAgent);
          agentRegistry.register(npc1);
        }
      }
      
      // 初始化记忆系统
      if (memoryStore && typeof memoryStore.updateConfig === 'function') {
        memoryStore.updateConfig(memoryConfig);
        
        // 添加初始记忆
        if (typeof memoryStore.addMemory === 'function') {
          memoryStore.addMemory({
            title: '初始记忆',
            content: '我来到了这个神秘的世界，准备开始探索。',
            timestamp: Date.now(),
            importance: 0.8
          });
        }
      }
      
      // 初始化游戏控制器
      if (gameController && typeof gameController.initialize === 'function') {
        gameController.initialize({
          memoryConfig,
          playerId: 'player',
          agents: ['player', 'npc1']
        });
      }
      
      console.log('游戏状态初始化成功');
    } catch (error) {
      console.error('初始化游戏状态失败:', error);
    }
  };
  
  useEffect(() => {
    // 初始化游戏状态
    initializeGameState();
    
    // 监听游戏事件，更新游戏历史
    const handleGameEvent = (event) => {
      if (event && event.type) {
        // 更新游戏历史
        setGameHistory(prev => {
          let updatedHistory = { ...prev };
          
          // 添加消息
          if (event.message) {
            updatedHistory.messages = [...prev.messages, {
              id: `msg_${Date.now()}`,
              content: event.message,
              type: event.type,
              sender: event.sender || 'system',
              timestamp: Date.now(),
              location: event.location || gameState.getCurrentLocation?.() || prev.currentLocation
            }];
          }
          
          // 更新角色
          if (event.character) {
            const characterExists = prev.characters.some(c => c.id === event.character.id);
            if (!characterExists && event.character.id) {
              updatedHistory.characters = [...prev.characters, event.character];
            }
          }
          
          // 更新位置
          if (event.location) {
            updatedHistory.currentLocation = event.location;
          }
          
          return updatedHistory;
        });
      }
    };
    
    // 注册事件监听
    if (gameController && typeof gameController.on === 'function') {
      gameController.on('gameEvent', handleGameEvent);
    }
    
    // 清理函数
    return () => {
      if (gameController && typeof gameController.off === 'function') {
        gameController.off('gameEvent', handleGameEvent);
      }
    };
  }, []);

  const initGame = () => {
    setGameStatus('playing');
  };

  // 处理玩家行动
  const handlePlayerAction = (action) => {
    try {
      if (gameController && typeof gameController.processPlayerAction === 'function') {
        const result = gameController.processPlayerAction(action);
        
        // 更新游戏历史
        if (result) {
          setGameHistory(prev => ({
            ...prev,
            messages: [...prev.messages, {
              id: `msg_${Date.now()}`,
              content: action.content || action.text,
              type: 'action',
              sender: 'player',
              timestamp: Date.now(),
              location: gameState.getCurrentLocation?.() || prev.currentLocation
            }]
          }));
        }
      } else {
        console.error('处理玩家行动失败: 游戏控制器未定义');
      }
    } catch (error) {
      console.error('处理玩家行动失败:', error, '行动:', action);
    }
  };
  
  // 自动保存
  useEffect(() => {
    if (gameStatus === 'playing') {
      const interval = setInterval(() => {
        try {
          // 自动保存
          if (gameController && typeof gameController.autoSave === 'function') {
            gameController.autoSave();
          }
          
          // 更新记忆系统
          if (memoryStore && typeof memoryStore.updateConfig === 'function') {
            memoryStore.updateConfig(memoryConfig);
          }
        } catch (error) {
          console.error('自动保存失败:', error);
        }
      }, 30000); // 每30秒自动保存
      
      return () => clearInterval(interval);
    }
  }, [gameStatus, memoryConfig]);

  return (
    <div className="game-container bg-gray-900 text-gray-100 min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">AI-TRPG 叙事系统</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧面板 - 游戏控制 */}
        <div className="lg:col-span-1">
          <GameControlPanel 
            onSettingsChange={(newSettings) => {
              // 处理设置变更
              if (newSettings.maxMemories) {
                setMemoryConfig(prev => ({
                  ...prev,
                  maxMemories: newSettings.maxMemories
                }));
              }
              
              if (newSettings.relevanceThreshold) {
                setMemoryConfig(prev => ({
                  ...prev,
                  relevanceThreshold: newSettings.relevanceThreshold
                }));
              }
            }}
            gameHistory={gameHistory}
          />
          
          {/* 行动输入面板 */}
          <div className="mt-6">
            <TRPGActionPanel 
              characters={[
                { id: 'npc1', name: '小镇长' }
              ]}
              items={[
                { id: 'map', name: '地图' },
                { id: 'potion', name: '药水' }
              ]}
              onSubmit={handlePlayerAction}
            />
          </div>
        </div>
        
        {/* 中间区域 - 主游戏区 */}
        <div className="lg:col-span-1 bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">当前场景</h2>
          
          {/* 安全地获取场景信息 */}
          <div className="bg-gray-700 p-4 rounded-lg mb-4">
            {(() => {
              try {
                const state = gameState.getState();
                const currentLocation = state?.world?.currentLocation || 'unknown';
                const locationData = state?.world?.locations?.[currentLocation];
                
                return (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {locationData?.name || '未知位置'}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      {locationData?.description || '没有可用的描述'}
                    </p>
                    
                    {locationData?.exits && locationData.exits.length > 0 && (
                      <div className="mt-2">
                        <span className="text-gray-400">出口: </span>
                        {locationData.exits.map((exit, idx) => (
                          <span key={idx} className="text-blue-400 mx-1">{exit}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              } catch (error) {
                console.error('获取场景信息失败:', error);
                return <p>无法加载场景信息</p>;
              }
            })()} 
          </div>
          
          {/* 对话历史 */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">对话历史</h3>
            <div className="bg-gray-700 p-3 rounded-lg max-h-80 overflow-y-auto">
              {/* 模拟对话历史 */}
              <div className="mb-2">
                <span className="text-blue-400 font-medium">玩家: </span>
                <span>你好，我是新来的旅行者。</span>
              </div>
              <div className="mb-2">
                <span className="text-green-400 font-medium">小镇长: </span>
                <span>欢迎来到我们的小镇！这里很安静，但最近发生了一些怪事...</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧区域 - 世界书 */}
        <div className="lg:col-span-1">
          <WorldCardPanel />
        </div>
      </div>
    </div>
  );
}
