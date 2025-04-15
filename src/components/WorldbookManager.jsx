import React, { useState, useEffect } from 'react';
import { Card, Tabs, Button, Input, List, Typography, Space, Divider, Modal, message, Tooltip, Tag, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, BookOutlined, InfoCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import gameState from '../modules/game_state';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

/**
 * 世界书管理组件
 * 用于管理游戏世界的背景、设定、规则等内容
 */
const WorldbookManager = () => {
  // 状态管理
  const [worldEntries, setWorldEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('general');
  const [editingEntry, setEditingEntry] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentEntry, setCurrentEntry] = useState({
    id: '',
    title: '',
    content: '',
    category: 'general',
    tags: [],
    priority: 50,
    enabled: true
  });

  // 加载世界书数据
  useEffect(() => {
    loadWorldbookEntries();
  }, []);

  // 加载世界书条目
  const loadWorldbookEntries = () => {
    try {
      // 使用新的 getWorldbookEntries 方法
      let entries = [];
      if (gameState.getWorldbookEntries && typeof gameState.getWorldbookEntries === 'function') {
        entries = gameState.getWorldbookEntries();
      } else {
        // 兼容旧版本
        const state = gameState.getState();
        entries = state.worldbook || [];
      }
      setWorldEntries(entries);
    } catch (error) {
      console.error('加载世界书数据失败:', error, error.stack);
      message.error('加载世界书数据失败');
    }
  };

  // 保存世界书条目
  const saveWorldbookEntries = (entries) => {
    try {
      const updatedEntries = entries || worldEntries;
      
      // 使用新的 updateWorldbookEntries 方法
      if (gameState.updateWorldbookEntries && typeof gameState.updateWorldbookEntries === 'function') {
        gameState.updateWorldbookEntries(updatedEntries);
      } else {
        // 兼容旧版本
        gameState.updateState({
          worldbook: updatedEntries
        });
      }
      
      message.success('世界书数据已保存');
    } catch (error) {
      console.error('保存世界书数据失败:', error, error.stack);
      message.error('保存世界书数据失败');
    }
  };

  // 添加新条目
  const addEntry = () => {
    setCurrentEntry({
      id: `entry_${Date.now()}`,
      title: '',
      content: '',
      category: activeTab,
      tags: [],
      priority: 50,
      enabled: true
    });
    setIsModalVisible(true);
    setEditingEntry(null);
  };

  // 编辑条目
  const editEntry = (entry) => {
    setCurrentEntry({...entry});
    setIsModalVisible(true);
    setEditingEntry(entry);
  };

  // 删除条目
  const deleteEntry = (entryId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个世界书条目吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const updatedEntries = worldEntries.filter(entry => entry.id !== entryId);
        setWorldEntries(updatedEntries);
        saveWorldbookEntries(updatedEntries);
      }
    });
  };

  // 保存条目
  const saveEntry = () => {
    if (!currentEntry.title.trim()) {
      message.warning('标题不能为空');
      return;
    }

    let updatedEntries;
    if (editingEntry) {
      // 更新现有条目
      updatedEntries = worldEntries.map(entry => 
        entry.id === editingEntry.id ? currentEntry : entry
      );
    } else {
      // 添加新条目
      updatedEntries = [...worldEntries, currentEntry];
    }

    setWorldEntries(updatedEntries);
    saveWorldbookEntries(updatedEntries);
    setIsModalVisible(false);
  };

  // 切换条目启用状态
  const toggleEntryEnabled = (entry) => {
    const updatedEntry = {...entry, enabled: !entry.enabled};
    const updatedEntries = worldEntries.map(e => 
      e.id === entry.id ? updatedEntry : e
    );
    setWorldEntries(updatedEntries);
    saveWorldbookEntries(updatedEntries);
  };

  // 过滤条目
  const filteredEntries = worldEntries.filter(entry => 
    (entry.category === activeTab || activeTab === 'all') &&
    (entry.title.toLowerCase().includes(searchText.toLowerCase()) || 
     entry.content.toLowerCase().includes(searchText.toLowerCase()) ||
     entry.tags.some(tag => tag.toLowerCase().includes(searchText.toLowerCase())))
  );

  // 渲染条目列表
  const renderEntryList = () => (
    <List
      itemLayout="vertical"
      dataSource={filteredEntries}
      renderItem={entry => (
        <List.Item
          key={entry.id}
          actions={[
            <Button 
              icon={<EditOutlined />} 
              onClick={() => editEntry(entry)}
              size="small"
            >
              编辑
            </Button>,
            <Button 
              icon={<DeleteOutlined />} 
              danger
              onClick={() => deleteEntry(entry.id)}
              size="small"
            >
              删除
            </Button>,
            <Button 
              type={entry.enabled ? "primary" : "default"}
              size="small"
              onClick={() => toggleEntryEnabled(entry)}
            >
              {entry.enabled ? '已启用' : '已禁用'}
            </Button>
          ]}
        >
          <List.Item.Meta
            title={
              <Space>
                <Text strong>{entry.title}</Text>
                <Text type="secondary">(优先级: {entry.priority})</Text>
              </Space>
            }
            description={
              <Space>
                {entry.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            }
          />
          <Paragraph ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
            {entry.content}
          </Paragraph>
        </List.Item>
      )}
    />
  );

  // 渲染编辑模态框
  const renderEditModal = () => (
    <Modal
      title={editingEntry ? "编辑世界书条目" : "添加世界书条目"}
      open={isModalVisible}
      onOk={saveEntry}
      onCancel={() => setIsModalVisible(false)}
      width={800}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input
          placeholder="标题"
          value={currentEntry.title}
          onChange={e => setCurrentEntry({...currentEntry, title: e.target.value})}
        />
        
        <TextArea
          placeholder="内容"
          value={currentEntry.content}
          onChange={e => setCurrentEntry({...currentEntry, content: e.target.value})}
          autoSize={{ minRows: 6, maxRows: 12 }}
        />
        
        <Space>
          <Text>分类:</Text>
          <select
            value={currentEntry.category}
            onChange={e => setCurrentEntry({...currentEntry, category: e.target.value})}
          >
            <option value="general">通用</option>
            <option value="characters">角色</option>
            <option value="locations">地点</option>
            <option value="items">物品</option>
            <option value="events">事件</option>
            <option value="lore">传说</option>
          </select>
          
          <Text>优先级:</Text>
          <Input
            type="number"
            min={0}
            max={100}
            value={currentEntry.priority}
            onChange={e => setCurrentEntry({...currentEntry, priority: parseInt(e.target.value) || 0})}
            style={{ width: 80 }}
          />
          
          <Text>标签:</Text>
          <Input
            placeholder="用逗号分隔标签"
            value={currentEntry.tags.join(',')}
            onChange={e => setCurrentEntry({...currentEntry, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)})}
          />
        </Space>
      </Space>
    </Modal>
  );

  return (
    <div className="worldbook-manager">
      <Card
        title={
          <Space>
            <BookOutlined />
            <span>世界书管理</span>
            <Tooltip title="世界书用于存储游戏世界的背景、设定、规则等内容，这些内容将作为上下文提供给AI">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addEntry}
          >
            添加条目
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.Search
            placeholder="搜索世界书条目..."
            onChange={e => setSearchText(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="全部" key="all" />
            <TabPane tab="通用" key="general" />
            <TabPane tab="角色" key="characters" />
            <TabPane tab="地点" key="locations" />
            <TabPane tab="物品" key="items" />
            <TabPane tab="事件" key="events" />
            <TabPane tab="传说" key="lore" />
          </Tabs>
          
          {renderEntryList()}
        </Space>
      </Card>
      
      {renderEditModal()}
      
      <Collapse style={{ marginTop: 16 }}>
        <Panel header="世界书使用说明" key="1">
          <Paragraph>
            <Text strong>什么是世界书？</Text>
            <br />
            世界书是一系列描述游戏世界的条目集合，包括背景、设定、规则等内容。这些内容将作为上下文提供给AI，帮助AI生成更符合游戏世界设定的内容。
          </Paragraph>
          
          <Paragraph>
            <Text strong>如何使用世界书？</Text>
            <br />
            1. 添加条目：点击"添加条目"按钮，填写标题、内容、分类等信息。
            <br />
            2. 编辑条目：点击条目右侧的"编辑"按钮。
            <br />
            3. 删除条目：点击条目右侧的"删除"按钮。
            <br />
            4. 启用/禁用条目：点击条目右侧的"启用/禁用"按钮。
          </Paragraph>
          
          <Paragraph>
            <Text strong>优先级说明：</Text>
            <br />
            优先级范围为0-100，数值越高表示该条目越重要，在上下文空间有限时优先保留。
          </Paragraph>
        </Panel>
      </Collapse>
    </div>
  );
};

export default WorldbookManager;
