import React, { useState, useEffect } from 'react';
import { Card, Timeline, Button, Modal, Form, Input, DatePicker, Select, Tag, message, Divider, Typography, Space, Tooltip, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ClockCircleOutlined, ExportOutlined, ImportOutlined, HistoryOutlined } from '@ant-design/icons';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

/**
 * 时间线查看器组件
 * 用于管理和展示游戏中的事件时间线
 */
function TimelineViewer() {
  // 状态
  const [events, setEvents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' 或 'desc'
  
  // 加载时间线数据
  useEffect(() => {
    const savedEvents = localStorage.getItem('timeline_events');
    if (savedEvents) {
      try {
        const parsedEvents = JSON.parse(savedEvents);
        setEvents(parsedEvents);
      } catch (error) {
        console.error('加载时间线数据失败:', error);
        message.error('加载时间线数据失败');
      }
    }
  }, []);
  
  // 保存时间线数据
  const saveEvents = (eventList) => {
    try {
      localStorage.setItem('timeline_events', JSON.stringify(eventList));
      setEvents(eventList);
      message.success('时间线数据已保存');
    } catch (error) {
      console.error('保存时间线数据失败:', error);
      message.error('保存失败: ' + error.message);
    }
  };
  
  // 添加新事件
  const addEvent = (eventData) => {
    const newEvent = {
      ...eventData,
      id: `event_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    const newEvents = [...events, newEvent];
    saveEvents(newEvents);
    return newEvent;
  };
  
  // 更新事件
  const updateEvent = (id, updates) => {
    const newEvents = events.map(event => 
      event.id === id ? { ...event, ...updates, updatedAt: new Date().toISOString() } : event
    );
    saveEvents(newEvents);
  };
  
  // 删除事件
  const deleteEvent = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个事件吗？此操作不可撤销。',
      onOk: () => {
        const newEvents = events.filter(event => event.id !== id);
        saveEvents(newEvents);
      }
    });
  };
  
  // 导出时间线
  const exportTimeline = () => {
    try {
      const dataStr = JSON.stringify(events, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `timeline_export_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      message.success('时间线导出成功');
    } catch (error) {
      console.error('导出时间线失败:', error);
      message.error('导出失败: ' + error.message);
    }
  };
  
  // 导入时间线
  const importTimeline = (e) => {
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
          const validEvents = data.filter(event => 
            event && typeof event === 'object' && event.title && event.date
          );
          
          if (validEvents.length > 0) {
            // 添加ID和创建时间（如果没有）
            const processedEvents = validEvents.map(event => ({
              ...event,
              id: event.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: event.createdAt || new Date().toISOString()
            }));
            
            saveEvents(processedEvents);
            message.success(`成功导入 ${processedEvents.length} 个事件`);
          } else {
            message.warning('导入的数据不包含有效的事件');
          }
        } else {
          message.error('导入的数据格式不正确，应为事件数组');
        }
      } catch (error) {
        console.error('导入时间线失败:', error);
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
  
  // 过滤事件
  const filterEvents = () => {
    let filteredEvents = [...events];
    
    // 按类型过滤
    if (timelineFilter !== 'all') {
      filteredEvents = filteredEvents.filter(event => event.type === timelineFilter);
    }
    
    // 排序
    filteredEvents.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      return sortOrder === 'asc' 
        ? dateA.getTime() - dateB.getTime() 
        : dateB.getTime() - dateA.getTime();
    });
    
    return filteredEvents;
  };
  
  // 获取事件类型颜色
  const getEventColor = (type) => {
    const colors = {
      'major': '#f5222d', // 主要事件
      'minor': '#faad14', // 次要事件
      'character': '#52c41a', // 角色事件
      'world': '#1890ff', // 世界事件
      'quest': '#722ed1', // 任务事件
      'other': '#bfbfbf' // 其他
    };
    
    return colors[type] || colors.other;
  };
  
  // 渲染添加/编辑事件模态框
  const renderEventModal = () => {
    const [form] = Form.useForm();
    const isEditing = !!editingEvent;
    
    // 初始化表单
    useEffect(() => {
      if (editingEvent) {
        form.setFieldsValue({
          title: editingEvent.title,
          date: moment(editingEvent.date),
          type: editingEvent.type,
          description: editingEvent.description,
          location: editingEvent.location,
          participants: editingEvent.participants
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: 'minor',
          date: moment()
        });
      }
    }, [form, editingEvent, showAddModal]);
    
    // 提交表单
    const handleSubmit = () => {
      form.validateFields()
        .then(values => {
          // 转换日期格式
          const formattedValues = {
            ...values,
            date: values.date.toISOString()
          };
          
          if (isEditing) {
            updateEvent(editingEvent.id, formattedValues);
            setEditingEvent(null);
          } else {
            addEvent(formattedValues);
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
        setEditingEvent(null);
      } else {
        setShowAddModal(false);
      }
      form.resetFields();
    };
    
    return (
      <Modal
        title={isEditing ? '编辑事件' : '添加事件'}
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
            name="title"
            label="事件标题"
            rules={[{ required: true, message: '请输入事件标题' }]}
          >
            <Input placeholder="输入事件标题" />
          </Form.Item>
          
          <Form.Item
            name="date"
            label="事件日期"
            rules={[{ required: true, message: '请选择事件日期' }]}
          >
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="事件类型"
            rules={[{ required: true, message: '请选择事件类型' }]}
          >
            <Select>
              <Option value="major">主要事件</Option>
              <Option value="minor">次要事件</Option>
              <Option value="character">角色事件</Option>
              <Option value="world">世界事件</Option>
              <Option value="quest">任务事件</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="location"
            label="事件地点"
          >
            <Input placeholder="输入事件发生地点" />
          </Form.Item>
          
          <Form.Item
            name="participants"
            label="参与者"
          >
            <Select mode="tags" placeholder="输入参与者名称，按回车添加">
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="事件描述"
            rules={[{ required: true, message: '请输入事件描述' }]}
          >
            <TextArea 
              placeholder="详细描述事件内容" 
              autoSize={{ minRows: 4, maxRows: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  };
  
  // 渲染时间线
  const renderTimeline = () => {
    const filteredEvents = filterEvents();
    
    if (filteredEvents.length === 0) {
      return (
        <Empty 
          description="暂无事件" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }
    
    return (
      <Timeline
        mode="left"
        reverse={sortOrder === 'desc'}
      >
        {filteredEvents.map(event => (
          <Timeline.Item
            key={event.id}
            color={getEventColor(event.type)}
            label={
              <div>
                <div>{moment(event.date).format('YYYY-MM-DD')}</div>
                <div>{moment(event.date).format('HH:mm:ss')}</div>
              </div>
            }
          >
            <div style={{ marginBottom: 8 }}>
              <Space align="center">
                <Text strong style={{ fontSize: 16 }}>{event.title}</Text>
                <Tag color={getEventColor(event.type)}>
                  {
                    event.type === 'major' ? '主要事件' :
                    event.type === 'minor' ? '次要事件' :
                    event.type === 'character' ? '角色事件' :
                    event.type === 'world' ? '世界事件' :
                    event.type === 'quest' ? '任务事件' : '其他'
                  }
                </Tag>
              </Space>
            </div>
            
            {event.location && (
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">地点: {event.location}</Text>
              </div>
            )}
            
            {event.participants && event.participants.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">参与者: </Text>
                {event.participants.map(participant => (
                  <Tag key={participant}>{participant}</Tag>
                ))}
              </div>
            )}
            
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
              {event.description}
            </div>
            
            <div>
              <Space>
                <Button 
                  icon={<EditOutlined />} 
                  size="small" 
                  onClick={() => setEditingEvent(event)}
                >
                  编辑
                </Button>
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small" 
                  danger
                  onClick={() => deleteEvent(event.id)}
                >
                  删除
                </Button>
              </Space>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };
  
  return (
    <div className="timeline-viewer">
      <Card 
        title={
          <Space>
            <HistoryOutlined />
            <span>时间线</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={timelineFilter}
              onChange={setTimelineFilter}
              style={{ width: 120 }}
            >
              <Option value="all">全部事件</Option>
              <Option value="major">主要事件</Option>
              <Option value="minor">次要事件</Option>
              <Option value="character">角色事件</Option>
              <Option value="world">世界事件</Option>
              <Option value="quest">任务事件</Option>
              <Option value="other">其他</Option>
            </Select>
            
            <Select
              value={sortOrder}
              onChange={setSortOrder}
              style={{ width: 120 }}
            >
              <Option value="desc">最新在前</Option>
              <Option value="asc">最早在前</Option>
            </Select>
            
            <Tooltip title="导入时间线">
              <Button 
                icon={<ImportOutlined />}
                onClick={() => document.getElementById('import-timeline').click()}
              />
              <input
                id="import-timeline"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={importTimeline}
              />
            </Tooltip>
            
            <Tooltip title="导出时间线">
              <Button 
                icon={<ExportOutlined />}
                onClick={exportTimeline}
                disabled={events.length === 0}
              />
            </Tooltip>
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setShowAddModal(true)}
            >
              添加事件
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            记录游戏中的重要事件，构建完整的故事时间线。
          </Text>
        </div>
        
        <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', padding: '0 16px' }}>
          {renderTimeline()}
        </div>
      </Card>
      
      {renderEventModal()}
    </div>
  );
}

export default TimelineViewer;
