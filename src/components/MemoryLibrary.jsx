import React, { useState, useEffect } from 'react';
import { Card, List, Input, Button, Tag, Select, Modal, Form, Tabs, message, Typography, Space, Tooltip, Empty, Divider } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, EditOutlined, ExportOutlined, ImportOutlined, DatabaseOutlined, FilterOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import agentRegistry from '../agent_registry';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Text, Title, Paragraph } = Typography;

/**
 * 记忆库组件
 * 用于管理和查看角色的记忆
 */
function MemoryLibrary() {
  // 状态
  const [memories, setMemories] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState(0);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  
  // 加载角色数据
  useEffect(() => {
    try {
      const agentList = agentRegistry.getAll() || [];
      setAgents(agentList);
      
      // 如果有玩家角色，默认选择玩家
      const playerAgent = agentList.find(agent => agent.id === 'player');
      if (playerAgent) {
        setSelectedAgent(playerAgent);
        loadMemories(playerAgent.id);
      } else if (agentList.length > 0) {
        setSelectedAgent(agentList[0]);
        loadMemories(agentList[0].id);
      }
    } catch (error) {
      console.error('加载角色数据失败:', error);
      message.error('加载角色数据失败');
    }
  }, []);
  
  // 加载记忆数据
  const loadMemories = (agentId) => {
    try {
      const savedMemories = localStorage.getItem(`memories_${agentId}`);
      if (savedMemories) {
        const parsedMemories = JSON.parse(savedMemories);
        setMemories(parsedMemories);
      } else {
        setMemories([]);
      }
    } catch (error) {
      console.error('加载记忆数据失败:', error);
      message.error('加载记忆数据失败');
      setMemories([]);
    }
  };
  
  // 保存记忆数据
  const saveMemories = (agentId, memoryList) => {
    try {
      localStorage.setItem(`memories_${agentId}`, JSON.stringify(memoryList));
      setMemories(memoryList);
      message.success('记忆数据已保存');
    } catch (error) {
      console.error('保存记忆数据失败:', error);
      message.error('保存失败: ' + error.message);
    }
  };
  
  // 添加新记忆
  const addMemory = (memoryData) => {
    if (!selectedAgent) {
      message.warning('请先选择一个角色');
      return;
    }
    
    const newMemory = {
      ...memoryData,
      id: `memory_${Date.now()}`,
      agentId: selectedAgent.id,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      accessCount: 0
    };
    
    const newMemories = [...memories, newMemory];
    saveMemories(selectedAgent.id, newMemories);
    return newMemory;
  };
  
  // 更新记忆
  const updateMemory = (id, updates) => {
    if (!selectedAgent) return;
    
    const newMemories = memories.map(memory => 
      memory.id === id ? { 
        ...memory, 
        ...updates, 
        updatedAt: new Date().toISOString() 
      } : memory
    );
    
    saveMemories(selectedAgent.id, newMemories);
  };
  
  // 删除记忆
  const deleteMemory = (id) => {
    if (!selectedAgent) return;
    
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个记忆吗？此操作不可撤销。',
      onOk: () => {
        const newMemories = memories.filter(memory => memory.id !== id);
        saveMemories(selectedAgent.id, newMemories);
      }
    });
  };
  
  // 访问记忆（增加访问计数）
  const accessMemory = (id) => {
    if (!selectedAgent) return;
    
    const newMemories = memories.map(memory => 
      memory.id === id ? { 
        ...memory, 
        accessCount: (memory.accessCount || 0) + 1,
        lastAccessedAt: new Date().toISOString()
      } : memory
    );
    
    saveMemories(selectedAgent.id, newMemories);
  };
  
  // 导出记忆
  const exportMemories = () => {
    if (!selectedAgent || memories.length === 0) {
      message.warning('没有可导出的记忆');
      return;
    }
    
    try {
      const dataStr = JSON.stringify(memories, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `memories_${selectedAgent.id}_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      message.success('记忆导出成功');
    } catch (error) {
      console.error('导出记忆失败:', error);
      message.error('导出失败: ' + error.message);
    }
  };
  
  // 导入记忆
  const importMemories = (e) => {
    if (!selectedAgent) {
      message.warning('请先选择一个角色');
      return;
    }
    
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // 尝试修复JSON格式问题
        let jsonStr = e.target.result;
        // 将单引号替换为双引号
        jsonStr = jsonStr.replace(/([\{\,]\s*)(')?([a-zA-Z0-9_]+)(')?\s*:/g, '$1"$3":');
        
        const data = JSON.parse(jsonStr);
        
        if (Array.isArray(data)) {
          // 验证数据格式
          const validMemories = data.filter(memory => 
            memory && typeof memory === 'object' && memory.content
          );
          
          if (validMemories.length > 0) {
            // 添加ID和创建时间（如果没有）
            const processedMemories = validMemories.map(memory => ({
              ...memory,
              id: memory.id || `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              agentId: selectedAgent.id,
              createdAt: memory.createdAt || new Date().toISOString(),
              lastAccessedAt: memory.lastAccessedAt || new Date().toISOString(),
              accessCount: memory.accessCount || 0
            }));
            
            // 合并现有记忆和新导入的记忆
            const mergedMemories = [...memories];
            
            // 检查重复并添加新记忆
            processedMemories.forEach(newMemory => {
              const existingIndex = mergedMemories.findIndex(m => 
                m.id === newMemory.id || 
                (m.content === newMemory.content && m.category === newMemory.category)
              );
              
              if (existingIndex >= 0) {
                // 更新现有记忆
                mergedMemories[existingIndex] = {
                  ...mergedMemories[existingIndex],
                  importance: Math.max(mergedMemories[existingIndex].importance || 0, newMemory.importance || 0),
                  updatedAt: new Date().toISOString()
                };
              } else {
                // 添加新记忆
                mergedMemories.push(newMemory);
              }
            });
            
            saveMemories(selectedAgent.id, mergedMemories);
            message.success(`成功导入 ${processedMemories.length} 个记忆`);
          } else {
            message.warning('导入的数据不包含有效的记忆');
          }
        } else {
          message.error('导入的数据格式不正确，应为记忆数组');
        }
      } catch (error) {
        console.error('导入记忆失败:', error);
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
    reader.readAsText(file);
    
    // 清空文件输入，以便可以重新选择同一个文件
    e.target.value = null;
  };
  
  // 过滤和排序记忆
  const filterAndSortMemories = () => {
    let result = [...memories];
    
    // 搜索过滤
    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      result = result.filter(memory => 
        memory.content.toLowerCase().includes(lowerSearchText) ||
        (memory.category && memory.category.toLowerCase().includes(lowerSearchText)) ||
        (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(lowerSearchText)))
      );
    }
    
    // 类别过滤
    if (categoryFilter !== 'all') {
      result = result.filter(memory => memory.category === categoryFilter);
    }
    
    // 重要性过滤
    if (importanceFilter > 0) {
      result = result.filter(memory => (memory.importance || 0) >= importanceFilter);
    }
    
    // 排序
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortField) {
        case 'importance':
          valueA = a.importance || 0;
          valueB = b.importance || 0;
          break;
        case 'accessCount':
          valueA = a.accessCount || 0;
          valueB = b.accessCount || 0;
          break;
        case 'lastAccessedAt':
          valueA = new Date(a.lastAccessedAt || a.createdAt).getTime();
          valueB = new Date(b.lastAccessedAt || b.createdAt).getTime();
          break;
        case 'createdAt':
        default:
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
      }
      
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });
    
    return result;
  };
  
  // 获取所有类别
  const getAllCategories = () => {
    const categories = new Set();
    memories.forEach(memory => {
      if (memory.category) {
        categories.add(memory.category);
      }
    });
    return Array.from(categories);
  };
  
  // 渲染添加/编辑记忆模态框
  const renderMemoryModal = () => {
    const [form] = Form.useForm();
    const isEditing = !!editingMemory;
    
    // 初始化表单
    useEffect(() => {
      if (editingMemory) {
        form.setFieldsValue({
          content: editingMemory.content,
          category: editingMemory.category,
          tags: editingMemory.tags,
          importance: editingMemory.importance || 0,
          source: editingMemory.source
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          importance: 0,
          category: '一般记忆'
        });
      }
    }, [form, editingMemory, showAddModal]);
    
    // 提交表单
    const handleSubmit = () => {
      form.validateFields()
        .then(values => {
          if (isEditing) {
            updateMemory(editingMemory.id, values);
            setEditingMemory(null);
          } else {
            addMemory(values);
            setShowAddModal(false);
          }
          form.resetFields();
        })
        .catch(info => {
          console.error('表单验证失败:', info);
        });
    };
    
    // 关闭模态框
    const handleCancel = () => {
      if (isEditing) {
        setEditingMemory(null);
      } else {
        setShowAddModal(false);
      }
      form.resetFields();
    };
    
    // 获取所有现有类别作为选项
    const categoryOptions = getAllCategories();
    
    return (
      <Modal
        title={isEditing ? '编辑记忆' : '添加记忆'}
        open={isEditing || showAddModal}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="content"
            label="记忆内容"
            rules={[{ required: true, message: '请输入记忆内容' }]}
          >
            <TextArea 
              placeholder="详细描述记忆内容" 
              autoSize={{ minRows: 4, maxRows: 8 }}
            />
          </Form.Item>
          
          <Form.Item
            name="category"
            label="类别"
          >
            <Select
              showSearch
              allowClear
              placeholder="选择或输入类别"
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ padding: '0 8px 4px' }}>
                    <Input
                      placeholder="输入新类别"
                      onPressEnter={(e) => {
                        const value = e.target.value.trim();
                        if (value) {
                          form.setFieldsValue({ category: value });
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>
                </>
              )}
            >
              {categoryOptions.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
              <Option value="一般记忆">一般记忆</Option>
              <Option value="重要事件">重要事件</Option>
              <Option value="人物关系">人物关系</Option>
              <Option value="地点信息">地点信息</Option>
              <Option value="知识">知识</Option>
              <Option value="目标">目标</Option>
              <Option value="情感">情感</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select mode="tags" placeholder="输入标签，按回车添加">
            </Select>
          </Form.Item>
          
          <Form.Item
            name="importance"
            label="重要性 (0-10)"
          >
            <Input type="number" min={0} max={10} />
          </Form.Item>
          
          <Form.Item
            name="source"
            label="来源"
          >
            <Input placeholder="记忆的来源，如对话、事件等" />
          </Form.Item>
        </Form>
      </Modal>
    );
  };
  
  // 渲染记忆列表
  const renderMemoryList = () => {
    const filteredMemories = filterAndSortMemories();
    
    if (filteredMemories.length === 0) {
      return (
        <Empty 
          description="暂无记忆" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }
    
    return (
      <List
        itemLayout="vertical"
        dataSource={filteredMemories}
        renderItem={memory => (
          <List.Item
            key={memory.id}
            actions={[
              <Button 
                icon={<EditOutlined />} 
                size="small" 
                onClick={() => {
                  setEditingMemory(memory);
                  accessMemory(memory.id);
                }}
              >
                编辑
              </Button>,
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
                onClick={() => deleteMemory(memory.id)}
              >
                删除
              </Button>
            ]}
            extra={
              <div style={{ textAlign: 'right' }}>
                <div>
                  <Text type="secondary">创建时间: </Text>
                  <Text>{new Date(memory.createdAt).toLocaleString()}</Text>
                </div>
                {memory.lastAccessedAt && (
                  <div>
                    <Text type="secondary">上次访问: </Text>
                    <Text>{new Date(memory.lastAccessedAt).toLocaleString()}</Text>
                  </div>
                )}
                <div>
                  <Text type="secondary">访问次数: </Text>
                  <Text>{memory.accessCount || 0}</Text>
                </div>
              </div>
            }
            onClick={() => accessMemory(memory.id)}
          >
            <List.Item.Meta
              title={
                <Space>
                  {memory.category && (
                    <Tag color="blue">{memory.category}</Tag>
                  )}
                  {memory.importance > 0 && (
                    <Tag color={memory.importance >= 8 ? 'red' : memory.importance >= 5 ? 'orange' : 'green'}>
                      重要性: {memory.importance}
                    </Tag>
                  )}
                </Space>
              }
              description={
                memory.tags && memory.tags.length > 0 && (
                  <div>
                    {memory.tags.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                )
              }
            />
            <Paragraph 
              ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
              style={{ marginBottom: 8 }}
            >
              {memory.content}
            </Paragraph>
            {memory.source && (
              <div>
                <Text type="secondary">来源: {memory.source}</Text>
              </div>
            )}
          </List.Item>
        )}
      />
    );
  };
  
  // 渲染记忆统计
  const renderMemoryStats = () => {
    if (!memories || memories.length === 0) {
      return <Text type="secondary">暂无记忆数据</Text>;
    }
    
    // 按类别统计
    const categoryStats = {};
    memories.forEach(memory => {
      const category = memory.category || '未分类';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    // 计算平均重要性
    const totalImportance = memories.reduce((sum, memory) => sum + (memory.importance || 0), 0);
    const avgImportance = memories.length > 0 ? (totalImportance / memories.length).toFixed(1) : 0;
    
    // 最常访问的记忆
    const mostAccessedMemory = [...memories].sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))[0];
    
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>记忆总数: </Text>
          <Text>{memories.length}</Text>
        </div>
        
        <div style={{ marginBottom: 8 }}>
          <Text strong>平均重要性: </Text>
          <Text>{avgImportance}</Text>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong>类别分布: </Text>
          <div style={{ marginTop: 8 }}>
            {Object.entries(categoryStats).map(([category, count]) => (
              <Tag key={category} style={{ marginBottom: 4 }}>
                {category}: {count}
              </Tag>
            ))}
          </div>
        </div>
        
        {mostAccessedMemory && mostAccessedMemory.accessCount > 0 && (
          <div>
            <Text strong>最常访问: </Text>
            <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
              <div style={{ marginBottom: 4 }}>
                <Tag color="blue">{mostAccessedMemory.category || '未分类'}</Tag>
                <Text type="secondary">访问次数: {mostAccessedMemory.accessCount}</Text>
              </div>
              <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                {mostAccessedMemory.content}
              </Paragraph>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="memory-library">
      <Card 
        title={
          <Space>
            <DatabaseOutlined />
            <span>记忆库</span>
            {selectedAgent && (
              <Tag color="blue">{selectedAgent.name}</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Select
              value={selectedAgent?.id}
              onChange={(value) => {
                const agent = agents.find(a => a.id === value);
                setSelectedAgent(agent);
                loadMemories(value);
              }}
              style={{ width: 150 }}
              placeholder="选择角色"
            >
              {agents.map(agent => (
                <Option key={agent.id} value={agent.id}>
                  {agent.name}
                </Option>
              ))}
            </Select>
            
            <Tooltip title="导入记忆">
              <Button 
                icon={<ImportOutlined />}
                onClick={() => document.getElementById('import-memories').click()}
                disabled={!selectedAgent}
              />
              <input
                id="import-memories"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={importMemories}
              />
            </Tooltip>
            
            <Tooltip title="导出记忆">
              <Button 
                icon={<ExportOutlined />}
                onClick={exportMemories}
                disabled={!selectedAgent || memories.length === 0}
              />
            </Tooltip>
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setShowAddModal(true)}
              disabled={!selectedAgent}
            >
              添加记忆
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="list">
          <TabPane tab="记忆列表" key="list">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Input.Search
                placeholder="搜索记忆内容或标签"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
              
              <Space>
                <Select
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  style={{ width: 120 }}
                  placeholder="类别筛选"
                >
                  <Option value="all">全部类别</Option>
                  {getAllCategories().map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
                
                <Select
                  value={importanceFilter}
                  onChange={setImportanceFilter}
                  style={{ width: 120 }}
                  placeholder="重要性筛选"
                >
                  <Option value={0}>全部重要性</Option>
                  <Option value={1}>≥ 1</Option>
                  <Option value={3}>≥ 3</Option>
                  <Option value={5}>≥ 5</Option>
                  <Option value={8}>≥ 8</Option>
                </Select>
                
                <Select
                  value={sortField}
                  onChange={setSortField}
                  style={{ width: 120 }}
                  placeholder="排序字段"
                >
                  <Option value="createdAt">创建时间</Option>
                  <Option value="lastAccessedAt">访问时间</Option>
                  <Option value="importance">重要性</Option>
                  <Option value="accessCount">访问次数</Option>
                </Select>
                
                <Button
                  icon={sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                />
              </Space>
            </div>
            
            <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
              {renderMemoryList()}
            </div>
          </TabPane>
          
          <TabPane tab="统计分析" key="stats">
            <div style={{ padding: '16px 0' }}>
              {renderMemoryStats()}
            </div>
          </TabPane>
        </Tabs>
      </Card>
      
      {renderMemoryModal()}
    </div>
  );
}

export default MemoryLibrary;
