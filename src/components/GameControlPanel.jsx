import { useState, useEffect } from 'react';
import { llmIntegration, memoryStore, memoryInjector } from '@/modules/index';
import { Tabs } from 'antd';
import StoryEvaluator from './StoryEvaluator';

export default function GameControlPanel({ onSettingsChange, gameHistory }) {
  // LLM参数状态
  const [settings, setSettings] = useState({
    temperature: 0.7,
    maxTokens: 256,
    useMemory: true,
    contextWeight: 0.5
  });
  
  // 记忆系统配置
  const [memoryConfig, setMemoryConfig] = useState({
    maxMemories: 3,
    minRelevance: 0.5
  });

  // 应用参数变更
  const handleApply = () => {
    // 更新LLM配置
    if (llmIntegration && typeof llmIntegration.updateConfig === 'function') {
      llmIntegration.updateConfig({
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        contextWeight: settings.contextWeight
      });
    }
    
    // 更新记忆系统配置
    if (memoryStore && typeof memoryStore.updateConfig === 'function') {
      memoryStore.updateConfig({
        maxMemories: memoryConfig.maxMemories,
        relevanceThreshold: memoryConfig.minRelevance
      });
    }
    
    // 更新记忆注入器配置
    if (memoryInjector && typeof memoryInjector.updateConfig === 'function') {
      memoryInjector.updateConfig({
        maxMemories: memoryConfig.maxMemories,
        relevanceThreshold: memoryConfig.minRelevance
      });
      memoryInjector.setEnabled(settings.useMemory);
    }
    
    onSettingsChange?.({
      ...settings,
      ...memoryConfig
    });
  };

  // 参数变更处理
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const [activeTab, setActiveTab] = useState('settings');

  // 标签页切换处理
  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  // 渲染设置面板
  const renderSettingsPanel = () => {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-white">
        <h2 className="text-xl font-bold mb-4">控制面板</h2>
        
        {/* LLM参数控制 */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">LLM参数</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block mb-1">
                创意度 (Temperature): {settings.temperature.toFixed(1)}
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block mb-1">
                响应长度: {settings.maxTokens} tokens
              </label>
              <input 
                type="range" 
                min="64" 
                max="512" 
                step="64"
                value={settings.maxTokens}
                onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="useMemory"
                checked={settings.useMemory}
                onChange={(e) => handleSettingChange('useMemory', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="useMemory">启用记忆系统</label>
            </div>
          </div>
        </div>
        
        {/* 记忆系统控制 */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">记忆系统</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block mb-1">
                最大记忆数: {memoryConfig.maxMemories}
              </label>
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="1"
                value={memoryConfig.maxMemories}
                onChange={(e) => setMemoryConfig(prev => ({
                  ...prev,
                  maxMemories: parseInt(e.target.value)
                }))}
                className="w-full"
                disabled={!settings.useMemory}
              />
            </div>
            
            <div>
              <label className="block mb-1">
                记忆相关性阈值: {memoryConfig.minRelevance.toFixed(1)}
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={memoryConfig.minRelevance}
                onChange={(e) => setMemoryConfig(prev => ({
                  ...prev,
                  minRelevance: parseFloat(e.target.value)
                }))}
                className="w-full"
                disabled={!settings.useMemory}
              />
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <button 
          onClick={handleApply}
          className="w-full bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded transition-colors"
        >
          应用设置
        </button>
      </div>
    );
  };

  // 渲染故事评估面板
  const renderStoryEvaluator = () => {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-white">
        <h2 className="text-xl font-bold mb-4">故事评估与小说生成</h2>
        <StoryEvaluator gameHistory={gameHistory} />
      </div>
    );
  };

  return (
    <div className="game-control-panel">
      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        type="card"
        items={[
          {
            key: 'settings',
            label: '游戏设置',
            children: renderSettingsPanel()
          },
          {
            key: 'story',
            label: '故事评估',
            children: renderStoryEvaluator()
          }
        ]}
      />
    </div>
  );
}
