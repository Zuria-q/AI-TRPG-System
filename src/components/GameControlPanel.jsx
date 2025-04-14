import { useState, useEffect } from 'react';
import llmIntegration from './llm_integration';
import memoryInjector from './memory_injector';

export default function GameControlPanel({ onSettingsChange }) {
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
    llmIntegration.updateConfig({
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      context_weight: settings.contextWeight
    });
    
    memoryInjector.updateConfig({
      maxMemories: memoryConfig.maxMemories,
      minRelevance: memoryConfig.minRelevance
    });
    
    memoryInjector.enabled = settings.useMemory;
    
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
}
