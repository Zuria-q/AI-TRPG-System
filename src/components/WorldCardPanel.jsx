import { useState, useEffect, useRef } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import memoryStore from './memory_store';
import agentRegistry from './agent_registry';
import gameState from './game_state';
import { saveAs } from 'file-saver';

export default function WorldCardPanel() {
  const [activeTab, setActiveTab] = useState('relationships');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [memories, setMemories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByImportance, setSortByImportance] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [mapData, setMapData] = useState([]);
  const fileInputRef = useRef(null);

  // 生成关系图谱数据
  useEffect(() => {
    if (activeTab === 'relationships') {
      const agents = agentRegistry.getAll();
      const nodes = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        group: agent.role,
        val: 5 + Math.sqrt(agentRegistry.getRelationshipCount(agent.id))
      }));

      const links = [];
      agents.forEach(agent => {
        agentRegistry.getRelationships(agent.id).forEach((relation, targetId) => {
          links.push({
            source: agent.id,
            target: targetId,
            value: Math.abs(relation) * 2
          });
        });
      });

      setGraphData({ nodes, links });
    }
  }, [activeTab]);

  // 加载记忆数据
  useEffect(() => {
    if (activeTab === 'memories') {
      const allMemories = [];

      ['player', ...agentRegistry.getAll().map(a => a.id)].forEach(agentId => {
        ['longTerm', 'shortTerm'].forEach(type => {
          const agentMemories = memoryStore.getMemories(agentId, type) || [];
          allMemories.push(...agentMemories.map(m => ({
            ...m,
            agentId,
            type
          })));
        });
      });

      setMemories(allMemories);
    }
  }, [activeTab]);

  // 加载地图数据
  useEffect(() => {
    if (activeTab === 'map') {
      const locations = gameState.getLocations();
      setMapData(locations.map(loc => ({
        ...loc,
        agents: agentRegistry.getAgentsAtLocation(loc.id)
      })));
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
    const data = {
      agents: agentRegistry.getAll(),
      memories: memoryStore.exportAll(),
      worldSettings: gameState.worldSettings,
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `world-data-${new Date().toISOString().slice(0, 10)}.json`);
  };

  // 导入世界数据
  const importWorldData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        agentRegistry.import(data.agents);
        memoryStore.import(data.memories);
        gameState.updateWorldSettings(data.worldSettings);
        alert('世界数据导入成功！');
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  // 在标签列表中添加'map'
  const tabs = ['relationships', 'memories', 'timeline', 'map', 'settings'];

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
              settings: '世界观设定'
            }[tab]}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'relationships' && (
          <div className="h-96 bg-gray-900 rounded">
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="name"
              nodeAutoColorBy="group"
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              linkColor={() => 'rgba(200, 200, 200, 0.4)'}
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
              {gameState.history.getKeyEvents().map((event, index) => (
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
              ))}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="grid grid-cols-3 gap-3">
            {mapData.map(location => (
              <div
                key={location.id}
                className="bg-gray-700 p-3 rounded cursor-pointer hover:bg-gray-600"
                onClick={() => gameState.moveToLocation(location.id)}
              >
                <h3 className="font-medium">{location.name}</h3>
                <p className="text-gray-400 text-sm">
                  {location.agents.length}位角色
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-4">世界观设定编辑器</h3>
            <textarea
              className="w-full h-64 p-2 bg-gray-800 rounded"
              defaultValue={gameState.worldSettings.description}
              placeholder="输入世界观设定..."
            />
            <button className="mt-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
              保存设定
            </button>
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
