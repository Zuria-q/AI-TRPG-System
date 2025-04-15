import { useState, useEffect, useRef } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { memoryStore, agentRegistry, gameState } from '@/modules/index';
import { saveAs } from 'file-saver';
import { Select, Tabs, Button, message } from 'antd';
import WorldSettingsEditor from './WorldSettingsEditor';
import MapEditor from './MapEditor';
import RelationshipEditor from './RelationshipEditor';
import CharacterEditor from './CharacterEditor';

const { TabPane } = Tabs;
const { Option } = Select;

export default function WorldCardPanel() {
  const [activeTab, setActiveTab] = useState('relationships');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [memories, setMemories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByImportance, setSortByImportance] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const fileInputRef = useRef(null);

  // 生成关系图谱数据
  useEffect(() => {
    if (activeTab === 'relationships') {
      try {
        // 确保agentRegistry存在且方法可用
        if (!agentRegistry || typeof agentRegistry.getAllAgents !== 'function') {
          console.error('agentRegistry未定义或方法不可用');
          setGraphData({ nodes: [], links: [] });
          return;
        }
        
        const agents = agentRegistry.getAllAgents() || {};
        const agentList = Object.values(agents);
        
        if (!agentList || agentList.length === 0) {
          // 如果没有角色，创建一个默认节点
          setGraphData({
            nodes: [{ id: 'player', name: '玩家', group: 'player', val: 5 }],
            links: []
          });
          return;
        }
        
        const nodes = agentList.map(agent => ({
          id: agent.id || 'unknown',
          name: agent.name || '未命名',
          group: agent.type || 'npc',
          val: 5
        }));

        const links = [];
        // 安全地获取关系数据
        if (typeof agentRegistry.getRelationships === 'function') {
          agentList.forEach(agent => {
            const relationships = agentRegistry.getRelationships(agent.id) || {};
            Object.entries(relationships).forEach(([targetId, relation]) => {
              if (targetId && relation !== undefined) {
                links.push({
                  source: agent.id,
                  target: targetId,
                  value: Math.abs(relation) * 2
                });
              }
            });
          });
        }

        setGraphData({ nodes, links });
      } catch (error) {
        console.error('生成关系图谱失败:', error);
        setGraphData({ nodes: [], links: [] });
      }
    }
  }, [activeTab]);

  // 加载记忆数据
  useEffect(() => {
    if (activeTab === 'memories') {
      try {
        const allMemories = [];
        
        // 确保memoryStore存在且方法可用
        if (!memoryStore || typeof memoryStore.getMemories !== 'function') {
          console.error('memoryStore未定义或方法不可用');
          setMemories([]);
          return;
        }
        
        // 获取所有角色ID
        let agentIds = ['player'];
        if (agentRegistry && typeof agentRegistry.getAllAgents === 'function') {
          const agents = agentRegistry.getAllAgents() || {};
          const agentList = Object.values(agents);
          agentIds = [...agentIds, ...agentList.map(a => a.id).filter(Boolean)];
        }
        
        // 获取所有记忆
        agentIds.forEach(agentId => {
          if (!agentId) return;
          
          ['longTerm', 'shortTerm'].forEach(type => {
            try {
              const agentMemories = memoryStore.getMemories(agentId, type) || [];
              allMemories.push(...agentMemories.map(m => ({
                ...m,
                agentId,
                type,
                content: m.content || '',
                title: m.title || '未命名记忆',
                timestamp: m.timestamp || Date.now(),
                importance: m.importance || 0.5
              })));
            } catch (memError) {
              console.error(`获取${agentId}的${type}记忆失败:`, memError);
            }
          });
        });

        setMemories(allMemories);
      } catch (error) {
        console.error('加载记忆数据失败:', error);
        setMemories([]);
      }
    }
  }, [activeTab]);

  // 加载地图数据
  useEffect(() => {
    if (activeTab === 'map') {
      try {
        // 确保gameState存在且方法可用
        if (!gameState || typeof gameState.getState !== 'function') {
          console.error('gameState未定义或方法不可用');
          setMapData([]);
          return;
        }
        
        // 创建默认位置数据
        const defaultLocations = [
          { id: 'start', name: '起始位置', description: '游戏开始的地方', x: 0, y: 0 },
          { id: 'town', name: '小镇', description: '一个安静的小镇', x: 100, y: 50 }
        ];
        
        // 尝试从游戏状态获取位置
        let locations = defaultLocations;
        const state = gameState.getState();
        if (state && state.world && state.world.locations) {
          const worldLocations = Object.values(state.world.locations);
          if (worldLocations.length > 0) {
            locations = worldLocations;
          }
        }
        
        // 安全地获取每个位置的角色
        const locationsWithAgents = locations.map(loc => {
          let agents = [];
          if (agentRegistry && typeof agentRegistry.getAllAgents === 'function') {
            const allAgents = agentRegistry.getAllAgents() || {};
            agents = Object.values(allAgents).filter(agent => 
              agent && agent.location === loc.id
            );
          }
          
          return {
            id: loc.id || 'unknown',
            name: loc.name || '未命名位置',
            description: loc.description || '没有描述',
            x: loc.x || 0,
            y: loc.y || 0,
            agents
          };
        });
        
        setMapData(locationsWithAgents);
      } catch (error) {
        console.error('加载地图数据失败:', error);
        setMapData([]);
      }
    }
  }, [activeTab]);

  // 过滤记忆
  const filteredMemories = memories.filter(memory =>
    memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memory.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 排序记忆
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    return sortByImportance ? b.importance - a.importance : b.timestamp - a.timestamp;
  });

  // 导出世界数据
  const exportWorldData = () => {
    try {
      // 安全地获取数据
      let agents = {};
      if (agentRegistry && typeof agentRegistry.getAllAgents === 'function') {
        agents = agentRegistry.getAllAgents() || {};
      }
      
      let memories = {};
      if (memoryStore && typeof memoryStore.getMemories === 'function') {
        // 简单导出当前内存中的记忆
        memories = { player: memoryStore.getMemories() || [] };
      }
      
      let worldSettings = {};
      if (gameState && typeof gameState.getState === 'function') {
        const state = gameState.getState();
        worldSettings = state.world || {};
      }
      
      const data = {
        agents,
        memories,
        worldSettings,
        version: '1.0',
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      saveAs(blob, `world-data-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (error) {
      console.error('导出世界数据失败:', error);
      alert('导出失败，请查看控制台获取详细错误信息');
    }
  };

  // 导入世界数据
  const importWorldData = (e) => {
    console.log('开始导入世界数据:', e);
    
    try {
      // 获取文件对象
      const file = e.target.files?.[0];
      if (!file) {
        console.error('未选择文件');
        message.error('请选择有效的JSON文件');
        return;
      }
      
      console.log('导入文件:', file.name, file.size, file.type);
      
      // 创建FileReader实例
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          // 检查读取结果
          if (!event.target || !event.target.result) {
            message.error('文件读取失败，请重试');
            return;
          }
          
          const content = event.target.result;
          console.log('文件内容长度:', content.length);
          
          // 尝试解析JSON
          let data;
          try {
            data = JSON.parse(content);
          } catch (jsonError) {
            console.error('JSON解析失败，尝试修复格式:', jsonError);
            
            // 尝试修复JSON格式问题
            let jsonStr = content;
            // 将单引号替换为双引号
            jsonStr = jsonStr.replace(/([\{\,]\s*)(')?([a-zA-Z0-9_]+)(')?(\s*:)/g, '$1"$3"$5');
            
            try {
              data = JSON.parse(jsonStr);
              console.log('JSON修复成功');
            } catch (fixError) {
              console.error('JSON修复失败:', fixError);
              message.error('JSON格式无效，无法解析文件');
              return;
            }
          }
          
          // 验证数据结构
          if (!data || typeof data !== 'object') {
            message.error('导入的数据格式无效');
            return;
          }
          
          console.log('解析的数据:', Object.keys(data));
          
          // 安全地导入数据
          let importSuccess = false;
          
          // 导入角色数据
          if (data.agents && agentRegistry && typeof agentRegistry.import === 'function') {
            try {
              agentRegistry.import(data.agents);
              console.log('角色数据导入成功');
              importSuccess = true;
            } catch (agentError) {
              console.error('导入角色数据失败:', agentError);
              message.warning('角色数据导入失败');
            }
          } else {
            console.warn('无法导入角色数据');
          }
          
          // 导入记忆数据
          if (data.memories && memoryStore && typeof memoryStore.import === 'function') {
            try {
              memoryStore.import(data.memories);
              console.log('记忆数据导入成功');
              importSuccess = true;
            } catch (memoryError) {
              console.error('导入记忆数据失败:', memoryError);
              message.warning('记忆数据导入失败');
            }
          } else {
            console.warn('无法导入记忆数据');
          }
          
          // 导入世界设置
          if (data.worldSettings && gameState && typeof gameState.updateWorldSettings === 'function') {
            try {
              gameState.updateWorldSettings(data.worldSettings);
              console.log('世界设置导入成功:', data.worldSettings);
              importSuccess = true;
            } catch (worldError) {
              console.error('导入世界设置失败:', worldError);
              message.warning('世界设置导入失败');
            }
          } else {
            console.warn('无法导入世界设置');
          }
          
          if (importSuccess) {
            message.success('世界数据导入成功！');
            
            // 刷新当前标签页数据
            if (activeTab === 'relationships') {
              setActiveTab('settings');
              setTimeout(() => setActiveTab('relationships'), 100);
            } else if (activeTab === 'memories') {
              setActiveTab('settings');
              setTimeout(() => setActiveTab('memories'), 100);
            } else if (activeTab === 'map') {
              setActiveTab('settings');
              setTimeout(() => setActiveTab('map'), 100);
            } else {
              // 刷新当前标签页
              const currentTab = activeTab;
              setActiveTab('settings');
              setTimeout(() => setActiveTab(currentTab), 100);
            }
          } else {
            message.error('没有成功导入任何数据');
          }
        } catch (error) {
          console.error('处理导入数据失败:', error);
          message.error(`导入失败: ${error.message}`);
          
          // 显示更详细的错误信息
          if (error instanceof SyntaxError) {
            const errorPosition = error.message.match(/position (\d+)/)?.[1];
            if (errorPosition) {
              const pos = parseInt(errorPosition);
              const errorContext = event.target.result.substring(
                Math.max(0, pos - 30), 
                Math.min(event.target.result.length, pos + 30)
              );
              console.error(`JSON错误上下文: ...${errorContext}...`);
              console.error(`请确保JSON文件使用双引号包围属性名称，并且格式正确。`);
            }
          }
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader错误:', error);
        message.error('读取文件时发生错误');
      };
      
      // 读取文件内容
      reader.readAsText(file);
    } catch (error) {
      console.error('导入世界数据错误:', error);
      message.error(`导入错误: ${error.message}`);
    }
  };

  // 所有标签页
  const tabs = ['relationships', 'memories', 'timeline', 'map', 'settings', 'characters', 'worldSettings'];

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">世界书</h2>
        <div className="flex space-x-2">
          <button
            onClick={exportWorldData}
            className="px-3 py-1 bg-green-600 rounded text-sm"
          >
            导出世界
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            className="px-3 py-1 bg-blue-600 rounded text-sm"
          >
            导入世界
            <input
              type="file"
              ref={fileInputRef}
              onChange={importWorldData}
              className="hidden"
              accept=".json"
            />
          </button>
        </div>
      </div>

      {/* 记忆排序切换 */}
      {activeTab === 'memories' && (
        <div className="flex items-center mb-2">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={sortByImportance}
                onChange={() => setSortByImportance(!sortByImportance)}
              />
              <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${sortByImportance ? 'transform translate-x-4 bg-blue-500' : ''}`}></div>
            </div>
            <div className="ml-3 text-sm">
              {sortByImportance ? '按重要性排序' : '按时间排序'}
            </div>
          </label>
        </div>
      )}

      {/* 标签页 */}
      <div className="flex border-b border-gray-600 mb-4">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 font-medium ${activeTab === tab ? 'border-b-2 border-blue-500' : 'text-gray-400'}`}
            onClick={() => setActiveTab(tab)}
          >
            {{
              relationships: '关系图谱',
              memories: '记忆库',
              timeline: '时间线',
              map: '地图',
              settings: '世界观设定',
              characters: '角色卡',
              worldSettings: '世界设定编辑'
            }[tab]}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'relationships' && (
          <div className="h-96 bg-gray-900 rounded">
            <RelationshipEditor 
              onSave={(relationshipData) => {
                // 更新关系图谱数据
                setGraphData(relationshipData);
                message.success('关系网络已更新');
              }}
            />
          </div>
        )}

        {activeTab === 'memories' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="搜索记忆..."
                className="w-full p-2 bg-gray-700 rounded"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {sortedMemories.length > 0 ? (
                sortedMemories.map((memory, index) => (
                  <div key={index} className="p-3 bg-gray-700 rounded">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>{memory.agentId} · {memory.type === 'longTerm' ? '长期记忆' : '短期记忆'}</span>
                      <span>重要性: {'★'.repeat(memory.importance)}</span>
                    </div>
                    <h3 className="font-medium">{memory.title}</h3>
                    <p className="text-gray-300">{memory.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">没有找到相关记忆</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2">游戏时间线</h3>
            <div className="space-y-2">
              {gameState.history && gameState.history.getKeyEvents ? gameState.history.getKeyEvents().map((event, index) => (
                <div
                  key={index}
                  className="flex p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                  onClick={() => setExpandedEvent(event)}
                >
                  <div className="w-16 text-gray-400">回合 {event.turn}</div>
                  <div className="flex-1">
                    <p>{event.actorId} → {event.action.type}</p>
                  </div>
                </div>
              )) : <div className="text-gray-400">暂无游戏历史记录</div>}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-gray-900 p-4 rounded">
            <MapEditor 
              onSave={(mapData) => {
                // 更新地图数据
                setMapData(mapData.locations || []);
                message.success('地图已更新');
              }}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-gray-900 p-4 rounded">
            <h3 className="text-lg font-semibold mb-4">世界观设定</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">基本信息</h4>
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="text-gray-400">世界名称: </span>
                    <span>{
                      gameState && typeof gameState.getState === 'function' && 
                      gameState.getState().world?.name || '未知世界'
                    }</span>
                  </div>
                  <div>
                    <span className="text-gray-400">时间: </span>
                    <span>{
                      gameState && typeof gameState.getState === 'function' && 
                      gameState.getState().world?.time || '白天'
                    }</span>
                  </div>
                  <div>
                    <span className="text-gray-400">天气: </span>
                    <span>{
                      gameState && typeof gameState.getState === 'function' && 
                      gameState.getState().world?.weather || '晴朗'
                    }</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium">角色信息</h4>
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="text-gray-400">角色数量: </span>
                    <span>{
                      agentRegistry && typeof agentRegistry.getAllAgents === 'function' && 
                      Object.keys(agentRegistry.getAllAgents() || {}).length || 0
                    }</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'worldSettings' && (
          <div className="bg-gray-900 p-4 rounded">
            <WorldSettingsEditor 
              onSave={(settings) => {
                // 刷新数据
                message.success('世界设定已保存');
                setActiveTab('settings');
                setTimeout(() => setActiveTab('worldSettings'), 100);
              }}
            />
          </div>
        )}
        
        {activeTab === 'characters' && (
          <div className="bg-gray-900 p-4 rounded">
            {/* 只显示角色卡编辑器，不显示其他世界书内容 */}
            <div className="character-editor-container">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">角色卡编辑器</h3>
                <div className="flex items-center">
                  <Select
                    style={{ width: 200 }}
                    placeholder="选择角色"
                    onChange={(value) => setSelectedAgent(value)}
                    value={selectedAgent}
                  >
                    {agentRegistry && typeof agentRegistry.getAllAgents === 'function' && 
                      Object.values(agentRegistry.getAllAgents() || {}).map(agent => (
                        <Option key={agent.id} value={agent.id}>{agent.name}</Option>
                      ))
                    }
                  </Select>
                  <Button 
                    type="primary" 
                    style={{ marginLeft: 8 }}
                    onClick={() => {
                      // 创建新角色
                      if (agentRegistry && typeof agentRegistry.createAgent === 'function') {
                        // 确保创建时personality是对象而不是字符串
                        const newAgent = agentRegistry.createAgent({
                          id: `agent_${Date.now()}`,
                          name: '新角色',
                          type: 'npc',
                          description: '新创建的角色',
                          personality: {
                            openness: 50,
                            conscientiousness: 50,
                            extraversion: 50,
                            agreeableness: 50,
                            neuroticism: 50
                          },
                          location: 'start',
                          skills: [],
                          relationships: []
                        });
                        
                        if (typeof agentRegistry.register === 'function') {
                          agentRegistry.register(newAgent);
                          setSelectedAgent(newAgent.id);
                          message.success('新角色已创建');
                        }
                      }
                    }}
                  >
                    创建新角色
                  </Button>
                </div>
              </div>
              
              <div className="character-editor-content">
                {selectedAgent ? (
                  <CharacterEditor agentId={selectedAgent} />
                ) : (
                  <div className="text-gray-400 text-center p-8">请选择一个角色进行编辑或创建新角色</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 时间线事件详情 */}
      {activeTab === 'timeline' && expandedEvent && (
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <h3 className="font-medium mb-2">事件详情</h3>
          <p><span className="text-gray-400">回合:</span> {expandedEvent.turn}</p>
          <p><span className="text-gray-400">动作:</span> {expandedEvent.action.type}</p>
          {expandedEvent.action.description && (
            <p><span className="text-gray-400">描述:</span> {expandedEvent.action.description}</p>
          )}
          <button
            onClick={() => setExpandedEvent(null)}
            className="mt-2 px-3 py-1 bg-gray-600 rounded text-sm"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
