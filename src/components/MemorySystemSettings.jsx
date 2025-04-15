import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Slider, Switch, Button, message, Divider, Tooltip, Typography, Space } from 'antd';
import { SaveOutlined, QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 记忆系统设置组件
 * 用于配置记忆系统的各项参数
 */
function MemorySystemSettings() {
  const [settings, setSettings] = useState({
    // 记忆检索设置
    retrievalSettings: {
      maxRetrievalCount: 5,        // 最大检索数量
      relevanceThreshold: 0.7,     // 相关性阈值
      recencyWeight: 0.3,          // 时间权重
      importanceWeight: 0.7,       // 重要性权重
      contextualBoost: 0.2,        // 上下文提升
    },
    
    // 记忆衰减设置
    decaySettings: {
      enabled: true,               // 是否启用衰减
      baseDecayRate: 0.05,         // 基础衰减率
      minImportance: 0.2,          // 最小重要性
      refreshOnAccess: true,       // 访问时刷新
      importanceThreshold: 0.4,    // 重要性阈值
    },
    
    // 记忆合并设置
    consolidationSettings: {
      enabled: true,               // 是否启用合并
      similarityThreshold: 0.8,    // 相似度阈值
      minOccurrences: 2,           // 最小出现次数
      consolidationInterval: 10,   // 合并间隔
      boostFactor: 1.5,            // 提升因子
    },
    
    // 记忆生成设置
    generationSettings: {
      automaticGeneration: true,   // 自动生成
      generationThreshold: 0.6,    // 生成阈值
      maxGenerationsPerTurn: 2,    // 每回合最大生成数
      summarizationEnabled: true,  // 启用总结
      summarizationInterval: 20,   // 总结间隔
    }
  });
  
  // 加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('memory_system_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('加载记忆系统设置失败:', error);
      }
    }
  }, []);
  
  // 保存设置
  const saveSettings = () => {
    try {
      localStorage.setItem('memory_system_settings', JSON.stringify(settings));
      message.success('记忆系统设置已保存');
    } catch (error) {
      console.error('保存记忆系统设置失败:', error);
      message.error('保存失败: ' + error.message);
    }
  };
  
  // 重置为默认设置
  const resetToDefaults = () => {
    setSettings({
      retrievalSettings: {
        maxRetrievalCount: 5,
        relevanceThreshold: 0.7,
        recencyWeight: 0.3,
        importanceWeight: 0.7,
        contextualBoost: 0.2,
      },
      decaySettings: {
        enabled: true,
        baseDecayRate: 0.05,
        minImportance: 0.2,
        refreshOnAccess: true,
        importanceThreshold: 0.4,
      },
      consolidationSettings: {
        enabled: true,
        similarityThreshold: 0.8,
        minOccurrences: 2,
        consolidationInterval: 10,
        boostFactor: 1.5,
      },
      generationSettings: {
        automaticGeneration: true,
        generationThreshold: 0.6,
        maxGenerationsPerTurn: 2,
        summarizationEnabled: true,
        summarizationInterval: 20,
      }
    });
    message.info('已重置为默认设置');
  };
  
  // 更新设置
  const updateSettings = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };
  
  return (
    <div className="memory-system-settings">
      <Card 
        title="记忆系统设置" 
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={resetToDefaults}
            >
              重置默认
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={saveSettings}
            >
              保存设置
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            配置记忆系统的各项参数，以优化角色记忆的检索、衰减、合并和生成。
          </Text>
        </div>
        
        <Divider orientation="left">
          <Space>
            记忆检索设置
            <Tooltip title="控制系统如何检索和排序相关记忆">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        </Divider>
        
        <Form layout="vertical">
          <Form.Item 
            label={
              <Space>
                最大检索数量
                <Tooltip title="每次检索最多返回的记忆条数">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <InputNumber 
              min={1} 
              max={20} 
              value={settings.retrievalSettings.maxRetrievalCount}
              onChange={(value) => updateSettings('retrievalSettings', 'maxRetrievalCount', value)}
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                相关性阈值
                <Tooltip title="记忆被检索所需的最小相关性分数">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Slider 
              min={0} 
              max={1} 
              step={0.01}
              value={settings.retrievalSettings.relevanceThreshold}
              onChange={(value) => updateSettings('retrievalSettings', 'relevanceThreshold', value)}
              marks={{
                0: '0',
                0.5: '0.5',
                1: '1'
              }}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                时间权重 vs 重要性权重
                <Tooltip title="记忆排序中时间因素与重要性因素的相对权重">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Slider 
              min={0} 
              max={1} 
              step={0.01}
              value={settings.retrievalSettings.recencyWeight}
              onChange={(value) => {
                updateSettings('retrievalSettings', 'recencyWeight', value);
                updateSettings('retrievalSettings', 'importanceWeight', 1 - value);
              }}
              marks={{
                0: '全重要性',
                0.5: '平衡',
                1: '全时间'
              }}
              tooltip={{
                formatter: (value) => `时间: ${(value * 100).toFixed(0)}%, 重要性: ${((1 - value) * 100).toFixed(0)}%`
              }}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                上下文提升
                <Tooltip title="当前上下文相关记忆的提升系数">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Slider 
              min={0} 
              max={1} 
              step={0.01}
              value={settings.retrievalSettings.contextualBoost}
              onChange={(value) => updateSettings('retrievalSettings', 'contextualBoost', value)}
              marks={{
                0: '0',
                0.5: '0.5',
                1: '1'
              }}
            />
          </Form.Item>
        </Form>
        
        <Divider orientation="left">
          <Space>
            记忆衰减设置
            <Tooltip title="控制记忆如何随时间衰减">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        </Divider>
        
        <Form layout="vertical">
          <Form.Item 
            label={
              <Space>
                启用记忆衰减
                <Tooltip title="是否随时间降低记忆的重要性">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Switch 
              checked={settings.decaySettings.enabled}
              onChange={(value) => updateSettings('decaySettings', 'enabled', value)}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                基础衰减率
                <Tooltip title="每个时间单位的基础衰减比例">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Slider 
              min={0} 
              max={0.5} 
              step={0.01}
              value={settings.decaySettings.baseDecayRate}
              onChange={(value) => updateSettings('decaySettings', 'baseDecayRate', value)}
              marks={{
                0: '0',
                0.25: '0.25',
                0.5: '0.5'
              }}
              disabled={!settings.decaySettings.enabled}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                最小重要性
                <Tooltip title="记忆重要性的最小值，低于此值可能被遗忘">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Slider 
              min={0} 
              max={1} 
              step={0.01}
              value={settings.decaySettings.minImportance}
              onChange={(value) => updateSettings('decaySettings', 'minImportance', value)}
              marks={{
                0: '0',
                0.5: '0.5',
                1: '1'
              }}
              disabled={!settings.decaySettings.enabled}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                访问时刷新
                <Tooltip title="是否在记忆被访问时重置其衰减计时器">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Switch 
              checked={settings.decaySettings.refreshOnAccess}
              onChange={(value) => updateSettings('decaySettings', 'refreshOnAccess', value)}
              disabled={!settings.decaySettings.enabled}
            />
          </Form.Item>
        </Form>
        
        <Divider orientation="left">
          <Space>
            记忆合并设置
            <Tooltip title="控制系统如何合并相似的记忆">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        </Divider>
        
        <Form layout="vertical">
          <Form.Item 
            label={
              <Space>
                启用记忆合并
                <Tooltip title="是否合并相似的记忆以形成更强的记忆">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Switch 
              checked={settings.consolidationSettings.enabled}
              onChange={(value) => updateSettings('consolidationSettings', 'enabled', value)}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                相似度阈值
                <Tooltip title="触发合并所需的最小相似度">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Slider 
              min={0} 
              max={1} 
              step={0.01}
              value={settings.consolidationSettings.similarityThreshold}
              onChange={(value) => updateSettings('consolidationSettings', 'similarityThreshold', value)}
              marks={{
                0: '0',
                0.5: '0.5',
                1: '1'
              }}
              disabled={!settings.consolidationSettings.enabled}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                最小出现次数
                <Tooltip title="触发合并所需的最小相似记忆数量">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <InputNumber 
              min={1} 
              max={10} 
              value={settings.consolidationSettings.minOccurrences}
              onChange={(value) => updateSettings('consolidationSettings', 'minOccurrences', value)}
              style={{ width: '100%' }}
              disabled={!settings.consolidationSettings.enabled}
            />
          </Form.Item>
        </Form>
        
        <Divider orientation="left">
          <Space>
            记忆生成设置
            <Tooltip title="控制系统如何自动生成新记忆">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        </Divider>
        
        <Form layout="vertical">
          <Form.Item 
            label={
              <Space>
                自动生成记忆
                <Tooltip title="是否从对话和事件中自动生成新记忆">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Switch 
              checked={settings.generationSettings.automaticGeneration}
              onChange={(value) => updateSettings('generationSettings', 'automaticGeneration', value)}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                生成阈值
                <Tooltip title="触发记忆生成所需的最小重要性分数">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Slider 
              min={0} 
              max={1} 
              step={0.01}
              value={settings.generationSettings.generationThreshold}
              onChange={(value) => updateSettings('generationSettings', 'generationThreshold', value)}
              marks={{
                0: '0',
                0.5: '0.5',
                1: '1'
              }}
              disabled={!settings.generationSettings.automaticGeneration}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                每回合最大生成数
                <Tooltip title="每个游戏回合最多生成的记忆数量">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <InputNumber 
              min={0} 
              max={10} 
              value={settings.generationSettings.maxGenerationsPerTurn}
              onChange={(value) => updateSettings('generationSettings', 'maxGenerationsPerTurn', value)}
              style={{ width: '100%' }}
              disabled={!settings.generationSettings.automaticGeneration}
            />
          </Form.Item>
          
          <Form.Item 
            label={
              <Space>
                启用记忆总结
                <Tooltip title="是否定期总结相关记忆形成更高级的洞察">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Switch 
              checked={settings.generationSettings.summarizationEnabled}
              onChange={(value) => updateSettings('generationSettings', 'summarizationEnabled', value)}
              disabled={!settings.generationSettings.automaticGeneration}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default MemorySystemSettings;
