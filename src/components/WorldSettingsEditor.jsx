import React, { useState, useEffect } from 'react';
import { gameState } from '@/modules/index';
import { Tabs, Form, Input, Button, Select, Collapse, Upload, message, Divider, Card, Tag } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { TextArea } = Input;
const { Option } = Select;

/**
 * 世界设定编辑器组件
 * 用于编辑游戏世界的各种设定和规则
 */
const WorldSettingsEditor = ({ onSave }) => {
  const [worldSettings, setWorldSettings] = useState({
    name: '',
    description: '',
    theme: '',
    genre: '',
    time: 'day',
    weather: 'clear',
    rules: [],
    factions: [],
    history: [],
    customProperties: {}
  });
  
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({ name: '', description: '' });
  const [editingFaction, setEditingFaction] = useState(null);
  const [newFaction, setNewFaction] = useState({ name: '', description: '', alignment: 'neutral' });
  const [editingHistoryEvent, setEditingHistoryEvent] = useState(null);
  const [newHistoryEvent, setNewHistoryEvent] = useState({ title: '', year: '', description: '' });
  const [newProperty, setNewProperty] = useState({ key: '', value: '' });
  
  // 加载世界设定
  useEffect(() => {
    try {
      if (gameState && typeof gameState.getState === 'function') {
        const state = gameState.getState();
        if (state && state.world) {
          setWorldSettings({
            name: state.world.name || '',
            description: state.world.description || '',
            theme: state.world.theme || '',
            genre: state.world.genre || '',
            time: state.world.time || 'day',
            weather: state.world.weather || 'clear',
            rules: state.world.rules || [],
            factions: state.world.factions || [],
            history: state.world.history || [],
            customProperties: state.world.customProperties || {}
          });
        }
      }
    } catch (error) {
      console.error('加载世界设定失败:', error);
    }
  }, []);
  
  // 保存世界设定
  const handleSave = () => {
    try {
      if (gameState && typeof gameState.updateWorldSettings === 'function') {
        gameState.updateWorldSettings(worldSettings);
        message.success('世界设定已保存');
        if (onSave) onSave(worldSettings);
      } else {
        message.error('保存失败: gameState未定义或方法不可用');
      }
    } catch (error) {
      console.error('保存世界设定失败:', error);
      message.error('保存失败: ' + error.message);
    }
  };
  
  // 更新基本信息
  const updateBasicInfo = (key, value) => {
    setWorldSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // 添加规则
  const addRule = () => {
    if (!newRule.name) {
      message.warning('规则名称不能为空');
      return;
    }
    
    setWorldSettings(prev => ({
      ...prev,
      rules: [...prev.rules, { ...newRule, id: `rule_${Date.now()}` }]
    }));
    setNewRule({ name: '', description: '' });
  };
  
  // 更新规则
  const updateRule = () => {
    if (!editingRule) return;
    
    setWorldSettings(prev => ({
      ...prev,
      rules: prev.rules.map(rule => 
        rule.id === editingRule.id ? editingRule : rule
      )
    }));
    setEditingRule(null);
  };
  
  // 删除规则
  const deleteRule = (ruleId) => {
    setWorldSettings(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
  };
  
  // 添加派系
  const addFaction = () => {
    if (!newFaction.name) {
      message.warning('派系名称不能为空');
      return;
    }
    
    setWorldSettings(prev => ({
      ...prev,
      factions: [...prev.factions, { ...newFaction, id: `faction_${Date.now()}` }]
    }));
    setNewFaction({ name: '', description: '', alignment: 'neutral' });
  };
  
  // 更新派系
  const updateFaction = () => {
    if (!editingFaction) return;
    
    setWorldSettings(prev => ({
      ...prev,
      factions: prev.factions.map(faction => 
        faction.id === editingFaction.id ? editingFaction : faction
      )
    }));
    setEditingFaction(null);
  };
  
  // 删除派系
  const deleteFaction = (factionId) => {
    setWorldSettings(prev => ({
      ...prev,
      factions: prev.factions.filter(faction => faction.id !== factionId)
    }));
  };
  
  // 添加历史事件
  const addHistoryEvent = () => {
    if (!newHistoryEvent.title) {
      message.warning('事件标题不能为空');
      return;
    }
    
    setWorldSettings(prev => ({
      ...prev,
      history: [...prev.history, { ...newHistoryEvent, id: `event_${Date.now()}` }]
    }));
    setNewHistoryEvent({ title: '', year: '', description: '' });
  };
  
  // 更新历史事件
  const updateHistoryEvent = () => {
    if (!editingHistoryEvent) return;
    
    setWorldSettings(prev => ({
      ...prev,
      history: prev.history.map(event => 
        event.id === editingHistoryEvent.id ? editingHistoryEvent : event
      )
    }));
    setEditingHistoryEvent(null);
  };
  
  // 删除历史事件
  const deleteHistoryEvent = (eventId) => {
    setWorldSettings(prev => ({
      ...prev,
      history: prev.history.filter(event => event.id !== eventId)
    }));
  };
  
  // 添加自定义属性
  const addCustomProperty = () => {
    if (!newProperty.key) {
      message.warning('属性名不能为空');
      return;
    }
    
    setWorldSettings(prev => ({
      ...prev,
      customProperties: {
        ...prev.customProperties,
        [newProperty.key]: newProperty.value
      }
    }));
    setNewProperty({ key: '', value: '' });
  };
  
  // 删除自定义属性
  const deleteCustomProperty = (key) => {
    setWorldSettings(prev => {
      const newProps = { ...prev.customProperties };
      delete newProps[key];
      return {
        ...prev,
        customProperties: newProps
      };
    });
  };
  
  // 导入JSON
  const handleImportJSON = (info) => {
    if (info.file.status !== 'uploading') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // 尝试修复JSON格式问题
          let jsonStr = e.target.result;
          // 将单引号替换为双引号
          jsonStr = jsonStr.replace(/([\{\,]\s*)(')?([a-zA-Z0-9_]+)(')?(\s*:)/g, '$1"$3"$5');
          
          const data = JSON.parse(jsonStr);
          if (data.world) {
            // 创建新的世界设定对象
            const newSettings = {
              name: data.world.name || worldSettings.name,
              description: data.world.description || worldSettings.description,
              theme: data.world.theme || worldSettings.theme,
              genre: data.world.genre || worldSettings.genre,
              time: data.world.time || worldSettings.time,
              weather: data.world.weather || worldSettings.weather,
              rules: data.world.rules || worldSettings.rules,
              factions: data.world.factions || worldSettings.factions,
              history: data.world.history || worldSettings.history,
              customProperties: data.world.customProperties || worldSettings.customProperties
            };
            
            // 更新组件状态
            setWorldSettings(newSettings);
            
            // 保存到游戏状态
            try {
              if (gameState && typeof gameState.updateWorldSettings === 'function') {
                gameState.updateWorldSettings(newSettings);
                message.success('成功导入并保存世界设定');
              } else {
                // 如果 gameState 不可用，尝试保存到本地存储
                localStorage.setItem('world_settings', JSON.stringify(newSettings));
                message.success('成功导入世界设定（仅保存到本地存储）');
              }
            } catch (saveError) {
              console.error('保存世界设定失败:', saveError);
              message.warning('导入成功但自动保存失败');
            }
          } else {
            message.warning('导入的JSON不包含世界设定数据');
          }
        } catch (error) {
          console.error('解析JSON失败:', error);
          message.error(`导入失败: ${error.message}`);
          
          // 显示更详细的错误信息
          if (error instanceof SyntaxError) {
            const errorPosition = error.message.match(/position (\d+)/)?.[1];
            if (errorPosition) {
              const pos = parseInt(errorPosition);
              const errorContext = e.target.result.substring(
                Math.max(0, pos - 30), 
                Math.min(e.target.result.length, pos + 30)
              );
              console.error(`JSON错误上下文: ...${errorContext}...`);
              console.error(`请确保JSON文件使用双引号包围属性名称，并且格式正确。`);
            }
          }
        }
      };
      reader.readAsText(info.file.originFileObj);
    }
  };

// ...
  
  // 渲染基本信息编辑界面
  const renderBasicInfoTab = () => (
    <Form layout="vertical">
      <Form.Item label="世界名称">
        <Input 
          value={worldSettings.name} 
          onChange={(e) => updateBasicInfo('name', e.target.value)}
          placeholder="输入世界名称"
        />
      </Form.Item>
      
      <Form.Item label="世界描述">
        <TextArea 
          value={worldSettings.description} 
          onChange={(e) => updateBasicInfo('description', e.target.value)}
          placeholder="描述这个世界的基本情况"
          rows={4}
        />
      </Form.Item>
      
      <Form.Item label="主题">
        <Input 
          value={worldSettings.theme} 
          onChange={(e) => updateBasicInfo('theme', e.target.value)}
          placeholder="例如：冒险、复仇、救赎等"
        />
      </Form.Item>
      
      <Form.Item label="类型">
        <Select
          value={worldSettings.genre}
          onChange={(value) => updateBasicInfo('genre', value)}
          placeholder="选择世界类型"
        >
          <Option value="fantasy">奇幻</Option>
          <Option value="scifi">科幻</Option>
          <Option value="modern">现代</Option>
          <Option value="horror">恐怖</Option>
          <Option value="historical">历史</Option>
          <Option value="postapocalyptic">后启示录</Option>
          <Option value="cyberpunk">赛博朋克</Option>
          <Option value="steampunk">蒸汽朋克</Option>
          <Option value="custom">自定义</Option>
        </Select>
      </Form.Item>
      
      <Form.Item label="时间">
        <Select
          value={worldSettings.time}
          onChange={(value) => updateBasicInfo('time', value)}
        >
          <Option value="day">白天</Option>
          <Option value="night">夜晚</Option>
          <Option value="dawn">黎明</Option>
          <Option value="dusk">黄昏</Option>
        </Select>
      </Form.Item>
      
      <Form.Item label="天气">
        <Select
          value={worldSettings.weather}
          onChange={(value) => updateBasicInfo('weather', value)}
        >
          <Option value="clear">晴朗</Option>
          <Option value="cloudy">多云</Option>
          <Option value="rainy">下雨</Option>
          <Option value="stormy">暴风雨</Option>
          <Option value="snowy">下雪</Option>
          <Option value="foggy">雾天</Option>
        </Select>
      </Form.Item>
    </Form>
  );
  
  // 渲染规则编辑界面
  const renderRulesTab = () => (
    <div>
      <Collapse accordion>
        {worldSettings.rules.map((rule) => (
          <Panel 
            key={rule.id} 
            header={rule.name}
            extra={
              <div onClick={(e) => e.stopPropagation()}>
                <Button 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={() => setEditingRule(rule)}
                  style={{ marginRight: 8 }}
                />
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small" 
                  danger
                  onClick={() => deleteRule(rule.id)}
                />
              </div>
            }
          >
            <p>{rule.description}</p>
          </Panel>
        ))}
      </Collapse>
      
      <Divider />
      
      {editingRule ? (
        <Card title="编辑规则" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="规则名称">
              <Input 
                value={editingRule.name} 
                onChange={(e) => setEditingRule({...editingRule, name: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="规则描述">
              <TextArea 
                value={editingRule.description} 
                onChange={(e) => setEditingRule({...editingRule, description: e.target.value})}
                rows={3}
              />
            </Form.Item>
            <Button type="primary" onClick={updateRule}>保存规则</Button>
            <Button onClick={() => setEditingRule(null)} style={{ marginLeft: 8 }}>取消</Button>
          </Form>
        </Card>
      ) : (
        <Card title="添加新规则" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="规则名称">
              <Input 
                value={newRule.name} 
                onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                placeholder="输入规则名称"
              />
            </Form.Item>
            <Form.Item label="规则描述">
              <TextArea 
                value={newRule.description} 
                onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                placeholder="详细描述规则内容"
                rows={3}
              />
            </Form.Item>
            <Button type="primary" onClick={addRule} icon={<PlusOutlined />}>添加规则</Button>
          </Form>
        </Card>
      )}
    </div>
  );
  
  // 渲染派系编辑界面
  const renderFactionsTab = () => (
    <div>
      <Collapse accordion>
        {worldSettings.factions.map((faction) => (
          <Panel 
            key={faction.id} 
            header={
              <span>
                {faction.name} 
                <Tag 
                  color={{
                    good: 'green',
                    evil: 'red',
                    neutral: 'blue',
                    chaotic: 'purple',
                    lawful: 'gold'
                  }[faction.alignment] || 'default'}
                  style={{ marginLeft: 8 }}
                >
                  {faction.alignment}
                </Tag>
              </span>
            }
            extra={
              <div onClick={(e) => e.stopPropagation()}>
                <Button 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={() => setEditingFaction(faction)}
                  style={{ marginRight: 8 }}
                />
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small" 
                  danger
                  onClick={() => deleteFaction(faction.id)}
                />
              </div>
            }
          >
            <p>{faction.description}</p>
          </Panel>
        ))}
      </Collapse>
      
      <Divider />
      
      {editingFaction ? (
        <Card title="编辑派系" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="派系名称">
              <Input 
                value={editingFaction.name} 
                onChange={(e) => setEditingFaction({...editingFaction, name: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="派系描述">
              <TextArea 
                value={editingFaction.description} 
                onChange={(e) => setEditingFaction({...editingFaction, description: e.target.value})}
                rows={3}
              />
            </Form.Item>
            <Form.Item label="阵营">
              <Select
                value={editingFaction.alignment}
                onChange={(value) => setEditingFaction({...editingFaction, alignment: value})}
              >
                <Option value="good">善良</Option>
                <Option value="evil">邪恶</Option>
                <Option value="neutral">中立</Option>
                <Option value="chaotic">混乱</Option>
                <Option value="lawful">守序</Option>
              </Select>
            </Form.Item>
            <Button type="primary" onClick={updateFaction}>保存派系</Button>
            <Button onClick={() => setEditingFaction(null)} style={{ marginLeft: 8 }}>取消</Button>
          </Form>
        </Card>
      ) : (
        <Card title="添加新派系" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="派系名称">
              <Input 
                value={newFaction.name} 
                onChange={(e) => setNewFaction({...newFaction, name: e.target.value})}
                placeholder="输入派系名称"
              />
            </Form.Item>
            <Form.Item label="派系描述">
              <TextArea 
                value={newFaction.description} 
                onChange={(e) => setNewFaction({...newFaction, description: e.target.value})}
                placeholder="详细描述派系背景、目标等"
                rows={3}
              />
            </Form.Item>
            <Form.Item label="阵营">
              <Select
                value={newFaction.alignment}
                onChange={(value) => setNewFaction({...newFaction, alignment: value})}
                placeholder="选择派系阵营"
              >
                <Option value="good">善良</Option>
                <Option value="evil">邪恶</Option>
                <Option value="neutral">中立</Option>
                <Option value="chaotic">混乱</Option>
                <Option value="lawful">守序</Option>
              </Select>
            </Form.Item>
            <Button type="primary" onClick={addFaction} icon={<PlusOutlined />}>添加派系</Button>
          </Form>
        </Card>
      )}
    </div>
  );
  
  // 渲染历史编辑界面
  const renderHistoryTab = () => (
    <div>
      <Collapse accordion>
        {worldSettings.history.sort((a, b) => a.year - b.year).map((event) => (
          <Panel 
            key={event.id} 
            header={`${event.year ? event.year + '年: ' : ''}${event.title}`}
            extra={
              <div onClick={(e) => e.stopPropagation()}>
                <Button 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={() => setEditingHistoryEvent(event)}
                  style={{ marginRight: 8 }}
                />
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small" 
                  danger
                  onClick={() => deleteHistoryEvent(event.id)}
                />
              </div>
            }
          >
            <p>{event.description}</p>
          </Panel>
        ))}
      </Collapse>
      
      <Divider />
      
      {editingHistoryEvent ? (
        <Card title="编辑历史事件" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="事件标题">
              <Input 
                value={editingHistoryEvent.title} 
                onChange={(e) => setEditingHistoryEvent({...editingHistoryEvent, title: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="年份">
              <Input 
                value={editingHistoryEvent.year} 
                onChange={(e) => setEditingHistoryEvent({...editingHistoryEvent, year: e.target.value})}
              />
            </Form.Item>
            <Form.Item label="事件描述">
              <TextArea 
                value={editingHistoryEvent.description} 
                onChange={(e) => setEditingHistoryEvent({...editingHistoryEvent, description: e.target.value})}
                rows={3}
              />
            </Form.Item>
            <Button type="primary" onClick={updateHistoryEvent}>保存事件</Button>
            <Button onClick={() => setEditingHistoryEvent(null)} style={{ marginLeft: 8 }}>取消</Button>
          </Form>
        </Card>
      ) : (
        <Card title="添加历史事件" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="事件标题">
              <Input 
                value={newHistoryEvent.title} 
                onChange={(e) => setNewHistoryEvent({...newHistoryEvent, title: e.target.value})}
                placeholder="输入事件标题"
              />
            </Form.Item>
            <Form.Item label="年份">
              <Input 
                value={newHistoryEvent.year} 
                onChange={(e) => setNewHistoryEvent({...newHistoryEvent, year: e.target.value})}
                placeholder="事件发生的年份"
              />
            </Form.Item>
            <Form.Item label="事件描述">
              <TextArea 
                value={newHistoryEvent.description} 
                onChange={(e) => setNewHistoryEvent({...newHistoryEvent, description: e.target.value})}
                placeholder="详细描述历史事件"
                rows={3}
              />
            </Form.Item>
            <Button type="primary" onClick={addHistoryEvent} icon={<PlusOutlined />}>添加事件</Button>
          </Form>
        </Card>
      )}
    </div>
  );
  
  // 渲染自定义属性编辑界面
  const renderCustomPropertiesTab = () => (
    <div>
      <Card title="自定义属性" style={{ marginBottom: 16 }}>
        {Object.entries(worldSettings.customProperties).map(([key, value]) => (
          <div key={key} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{key}:</strong> {value}
            </div>
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              onClick={() => deleteCustomProperty(key)}
            />
          </div>
        ))}
        
        {Object.keys(worldSettings.customProperties).length === 0 && (
          <p>暂无自定义属性</p>
        )}
      </Card>
      
      <Card title="添加自定义属性">
        <Form layout="vertical">
          <Form.Item label="属性名">
            <Input 
              value={newProperty.key} 
              onChange={(e) => setNewProperty({...newProperty, key: e.target.value})}
              placeholder="输入属性名"
            />
          </Form.Item>
          <Form.Item label="属性值">
            <Input 
              value={newProperty.value} 
              onChange={(e) => setNewProperty({...newProperty, value: e.target.value})}
              placeholder="输入属性值"
            />
          </Form.Item>
          <Button type="primary" onClick={addCustomProperty} icon={<PlusOutlined />}>添加属性</Button>
        </Form>
      </Card>
    </div>
  );
  
  // 渲染导入/导出界面
  const renderImportExportTab = () => (
    <div>
      <Card title="导入/导出世界设定" style={{ marginBottom: 16 }}>
        <p>您可以导入JSON格式的世界设定，或将当前设定导出为JSON文件。</p>
        
        <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
          <Upload
            accept=".json"
            showUploadList={false}
            customRequest={() => {}}
            onChange={handleImportJSON}
            beforeUpload={(file) => {
              const isJSON = file.type === 'application/json' || file.name.endsWith('.json');
              if (!isJSON) {
                message.error('只能上传JSON文件!');
              }
              return isJSON;
            }}
          >
            <Button icon={<UploadOutlined />}>导入JSON</Button>
          </Upload>
          
          <Button 
            onClick={() => {
              const dataStr = JSON.stringify({ world: worldSettings }, null, 2);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `world-settings-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            导出JSON
          </Button>
        </div>
      </Card>
    </div>
  );
  
  return (
    <div className="world-settings-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>世界设定编辑器</h2>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存所有设定
        </Button>
      </div>
      
      <Tabs defaultActiveKey="basic">
        <TabPane tab="基本信息" key="basic">
          {renderBasicInfoTab()}
        </TabPane>
        <TabPane tab="规则系统" key="rules">
          {renderRulesTab()}
        </TabPane>
        <TabPane tab="派系" key="factions">
          {renderFactionsTab()}
        </TabPane>
        <TabPane tab="历史" key="history">
          {renderHistoryTab()}
        </TabPane>
        <TabPane tab="自定义属性" key="custom">
          {renderCustomPropertiesTab()}
        </TabPane>
        <TabPane tab="导入/导出" key="import-export">
          {renderImportExportTab()}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default WorldSettingsEditor;
