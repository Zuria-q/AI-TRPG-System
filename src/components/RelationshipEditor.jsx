// RelationshipEditor.jsx
import React, { useState, useEffect, useCallback } from 'react';
import agentRegistry from '../agent_registry';
import trustMap from '../trust_map';
import { ForceGraph2D } from 'react-force-graph';
import { Card, Button, Slider, Select, Input, Form, List, Divider, message, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';

const { Option } = Select;

/**
 * 关系网络编辑器组件
 * 用于编辑角色之间的关系网络
 */
function RelationshipEditor({ onSave }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [agents, setAgents] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [editingRelationship, setEditingRelationship] = useState(null);
  const [newRelationship, setNewRelationship] = useState({ source: '', target: '', value: 0, type: 'neutral' });
  const [showAddModal, setShowAddModal] = useState(false);
  
  // 根据关系值获取关系类型
  const getRelationshipType = useCallback((value) => {
    if (value >= 0.7) return 'ally';
    if (value >= 0.3) return 'friend';
    if (value > -0.3) return 'neutral';
    if (value > -0.7) return 'dislike';
    return 'enemy';
  }, []);
  
  // 加载角色和关系数据
  useEffect(() => {
    try {
      if (agentRegistry && typeof agentRegistry.getAll === 'function') {
        const agentList = agentRegistry.getAll() || [];
        
        setAgents(agentList);
        
        // 创建节点
        const nodes = agentList.map(agent => ({
          id: agent.id,
          name: agent.name || '未命名',
          group: agent.type || 'npc',
          val: 5
        }));
        
        // 创建连接
        const links = [];
        
        // 从每个角色的relationships属性获取关系数据
        agentList.forEach(agent => {
          if (agent.relationships && Array.isArray(agent.relationships)) {
            agent.relationships.forEach(rel => {
              if (rel.targetId) {
                // 使用深拷贝创建新对象
                links.push({
                  source: agent.id,
                  target: rel.targetId,
                  value: rel.closeness / 100, // 将closeness转换为-1到1的值
                  type: rel.type || 'neutral'
                });
              }
            });
          }
        });
        
        setGraphData({ nodes, links });
      }
    } catch (error) {
      console.error('加载关系数据失败:', error);
    }
  }, []);
  
  // 根据关系类型获取关系值
  const getRelationshipValue = (type) => {
    const values = {
      ally: 0.8,
      friend: 0.5,
      neutral: 0,
      dislike: -0.5,
      enemy: -0.8
    };
    return values[type] || 0;
  };
  
  // 根据关系类型获取颜色
  const getRelationshipColor = (type) => {
    const colors = {
      ally: '#27ae60',
      friend: '#2ecc71',
      neutral: '#95a5a6',
      dislike: '#e74c3c',
      enemy: '#c0392b'
    };
    return colors[type] || colors.neutral;
  };
  
  // 获取角色名称
  const getAgentName = useCallback((id) => {
    if (!id) return '未知';
    
    // 处理当source或target是对象而不是ID的情况
    if (typeof id === 'object' && id.id) {
      return id.name || id.id;
    }
    
    const agent = agents.find(a => a.id === id);
    return agent ? agent.name : id;
  }, [agents]);
  
  // 渲染图表
  const renderGraph = useCallback(() => {
    // 创建图表数据的深拷贝以避免React错误#31
    const safeGraphData = {
      nodes: graphData.nodes.map(node => ({ ...node })),
      links: graphData.links.map(link => ({ 
        source: link.source,
        target: link.target,
        value: link.value,
        type: link.type 
      }))
    };
    
    return (
      <ForceGraph2D
        graphData={safeGraphData}
        nodeLabel={node => `${node.name || node.id}`}
        linkLabel={link => {
          const sourceName = typeof link.source === 'object' ? link.source.name : getAgentName(link.source);
          const targetName = typeof link.target === 'object' ? link.target.name : getAgentName(link.target);
          return `${sourceName}-${targetName}: ${link.type}`;
        }}
        linkColor={link => getRelationshipColor(link.type)}
        linkWidth={2}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name || node.id;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = node.group === 'player' ? '#3498db' : '#e74c3c';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'black';
          ctx.fillText(label, node.x, node.y + 10);
        }}
        onLinkClick={link => setSelectedLink(link)}
        cooldownTicks={100}
      />
    );
  }, [graphData, getAgentName]);
  
  // 添加新关系
  const addRelationship = () => {
    if (!newRelationship.source || !newRelationship.target) {
      message.warning('必须选择源角色和目标角色');
      return;
    }
    
    if (newRelationship.source === newRelationship.target) {
      message.warning('源角色和目标角色不能相同');
      return;
    }
    
    // 检查是否已存在相同的关系
    const exists = graphData.links.some(
      link => (link.source === newRelationship.source && link.target === newRelationship.target) ||
              (link.source === newRelationship.target && link.target === newRelationship.source)
    );
    
    if (exists) {
      message.warning('该关系已存在');
      return;
    }
    
    // 添加新关系
    const newLink = {
      source: newRelationship.source,
      target: newRelationship.target,
      value: newRelationship.value || getRelationshipValue(newRelationship.type),
      type: newRelationship.type || getRelationshipType(newRelationship.value)
    };
    
    setGraphData(prev => ({
      ...prev,
      links: [...prev.links, newLink]
    }));
    
    // 更新信任地图
    if (trustMap && typeof trustMap.setTrustLevel === 'function') {
      trustMap.setTrustLevel(newRelationship.source, newRelationship.target, newLink.value);
    }
    
    setNewRelationship({ source: '', target: '', value: 0, type: 'neutral' });
    setShowAddModal(false);
  };
  
  // 更新关系
  const updateRelationship = () => {
    if (!editingRelationship) return;
    
    // 更新图数据
    setGraphData(prev => ({
      ...prev,
      links: prev.links.map(link => {
        if ((link.source === editingRelationship.source && link.target === editingRelationship.target) ||
            (link.source === editingRelationship.target && link.target === editingRelationship.source)) {
          return {
            ...link,
            value: editingRelationship.value,
            type: getRelationshipType(editingRelationship.value)
          };
        }
        return link;
      })
    }));
    
    // 更新信任地图
    if (trustMap && typeof trustMap.setTrustLevel === 'function') {
      trustMap.setTrustLevel(editingRelationship.source, editingRelationship.target, editingRelationship.value);
    }
    
    setEditingRelationship(null);
  };
  
  // 删除关系
  const deleteRelationship = (source, target) => {
    // 更新图数据
    setGraphData(prev => ({
      ...prev,
      links: prev.links.filter(link => 
        !((link.source === source && link.target === target) ||
          (link.source === target && link.target === source))
      )
    }));
    
    // 更新信任地图
    if (trustMap && typeof trustMap.setTrustLevel === 'function') {
      trustMap.setTrustLevel(source, target, 0);
    }
  };
  
  // 保存所有关系
  const saveRelationships = () => {
    try {
      // 更新所有关系
      graphData.links.forEach(link => {
        if (trustMap && typeof trustMap.setTrustLevel === 'function') {
          trustMap.setTrustLevel(link.source, link.target, link.value);
        }
      });
      
      message.success('关系网络已保存');
      if (onSave) onSave(graphData);
    } catch (error) {
      console.error('保存关系网络失败:', error);
      message.error('保存失败: ' + error.message);
    }
  };
  
  // 渲染关系列表
  const renderRelationshipsList = () => (
    <List
      bordered
      dataSource={graphData.links}
      renderItem={link => {
        const sourceAgent = agents.find(a => a.id === link.source);
        const targetAgent = agents.find(a => a.id === link.target);
        
        return (
          <List.Item
            actions={[
              <Button 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => setEditingRelationship({
                  source: link.source,
                  target: link.target,
                  value: link.value,
                  type: link.type
                })}
              />,
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
                onClick={() => deleteRelationship(link.source, link.target)}
              />
            ]}
          >
            <div>
              <span style={{ fontWeight: 'bold' }}>{sourceAgent?.name || link.source}</span>
              <span style={{ margin: '0 8px', color: getRelationshipColor(link.type) }}>
                {link.type === 'ally' ? '盟友' :
                 link.type === 'friend' ? '友好' :
                 link.type === 'neutral' ? '中立' :
                 link.type === 'dislike' ? '不喜' :
                 link.type === 'enemy' ? '敌对' : '未知'}
                ({link.value.toFixed(1)})
              </span>
              <span style={{ fontWeight: 'bold' }}>{targetAgent?.name || link.target}</span>
            </div>
          </List.Item>
        );
      }}
    />
  );
  
  // 渲染关系编辑表单
  const renderRelationshipForm = () => (
    <Form layout="vertical">
      <Form.Item label="关系值">
        <Slider
          min={-1}
          max={1}
          step={0.1}
          value={editingRelationship.value}
          onChange={value => setEditingRelationship({ ...editingRelationship, value })}
          marks={{
            '-1': '敌对',
            '-0.5': '不喜',
            '0': '中立',
            '0.5': '友好',
            '1': '盟友'
          }}
        />
      </Form.Item>
      <Button type="primary" onClick={updateRelationship}>保存关系</Button>
      <Button onClick={() => setEditingRelationship(null)} style={{ marginLeft: 8 }}>取消</Button>
    </Form>
  );
  
  // 渲染添加关系模态框
  const renderAddRelationshipModal = () => (
    <Modal
      title="添加新关系"
      open={showAddModal}
      onOk={addRelationship}
      onCancel={() => setShowAddModal(false)}
    >
      <Form layout="vertical">
        <Form.Item label="源角色">
          <Select
            value={newRelationship.source}
            onChange={value => setNewRelationship({ ...newRelationship, source: value })}
            placeholder="选择源角色"
          >
            {agents.map(agent => (
              <Option key={agent.id} value={agent.id}>{agent.name}</Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item label="目标角色">
          <Select
            value={newRelationship.target}
            onChange={value => setNewRelationship({ ...newRelationship, target: value })}
            placeholder="选择目标角色"
          >
            {agents.map(agent => (
              <Option key={agent.id} value={agent.id}>{agent.name}</Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item label="关系值">
          <Slider
            min={-1}
            max={1}
            step={0.1}
            value={newRelationship.value}
            onChange={value => setNewRelationship({ 
              ...newRelationship, 
              value,
              type: getRelationshipType(value)
            })}
            marks={{
              '-1': '敌对',
              '-0.5': '不喜',
              '0': '中立',
              '0.5': '友好',
              '1': '盟友'
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
  
  return (
    <div className="relationship-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>关系网络编辑器</h2>
        <div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setShowAddModal(true)}
            style={{ marginRight: 8 }}
          >
            添加关系
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={saveRelationships}
          >
            保存网络
          </Button>
        </div>
      </div>
      
      <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
        {/* 关系图 */}
        <div style={{ flex: 2, border: '1px solid #ccc', height: '100%' }}>
          {renderGraph()}
        </div>
        
        {/* 编辑面板 */}
        <div style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
          <Card title="关系列表" style={{ marginBottom: 16 }}>
            {renderRelationshipsList()}
          </Card>
          
          {editingRelationship && (
            <Card title="编辑关系" style={{ marginBottom: 16 }}>
              {renderRelationshipForm()}
            </Card>
          )}
        </div>
      </div>
      
      {renderAddRelationshipModal()}
    </div>
  );
}

export default RelationshipEditor;
