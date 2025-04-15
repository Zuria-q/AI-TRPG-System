import React, { useState } from 'react';
import { Card, Input, Button, Switch, InputNumber, Select, Typography, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

/**
 * 世界书条目组件
 * 用于显示和编辑单个世界书条目
 */
const WorldbookEntry = ({ entry, onSave, onDelete, categories = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState({ ...entry });

  // 处理输入变化
  const handleChange = (field, value) => {
    setEditedEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 保存编辑
  const handleSave = () => {
    // 确保必填字段不为空
    if (!editedEntry.title?.trim()) {
      return;
    }
    
    onSave(editedEntry);
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditedEntry({ ...entry });
    setIsEditing(false);
  };

  // 渲染查看模式
  const renderViewMode = () => (
    <Card
      title={
        <Space>
          <Switch 
            checked={entry.enabled} 
            onChange={(checked) => onSave({ ...entry, enabled: checked })}
            size="small"
          />
          <Text strong>{entry.title}</Text>
          {entry.category && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              [{entry.category}]
            </Text>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => setIsEditing(true)}
          />
          <Popconfirm
            title="确定要删除这个条目吗？"
            onConfirm={() => onDelete(entry.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
            />
          </Popconfirm>
        </Space>
      }
      size="small"
      style={{ 
        marginBottom: '10px',
        opacity: entry.enabled ? 1 : 0.6
      }}
    >
      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
        <Text>{entry.content}</Text>
      </div>
      <div style={{ marginTop: '10px', textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          优先级: {entry.priority || 0}
        </Text>
      </div>
    </Card>
  );

  // 渲染编辑模式
  const renderEditMode = () => (
    <Card
      title="编辑条目"
      extra={
        <Space>
          <Button 
            icon={<SaveOutlined />} 
            type="primary" 
            size="small" 
            onClick={handleSave}
          />
          <Button 
            icon={<CloseOutlined />} 
            size="small" 
            onClick={handleCancel}
          />
        </Space>
      }
      size="small"
      style={{ marginBottom: '10px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>标题</Text>
          <Input 
            value={editedEntry.title} 
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="条目标题"
          />
        </div>
        
        <div>
          <Text strong>分类</Text>
          <Select
            value={editedEntry.category}
            onChange={(value) => handleChange('category', value)}
            style={{ width: '100%' }}
            allowClear
            placeholder="选择分类"
            dropdownRender={(menu) => (
              <>
                {menu}
              </>
            )}
          >
            {categories.map(cat => (
              <Option key={cat} value={cat}>{cat}</Option>
            ))}
          </Select>
        </div>
        
        <div>
          <Text strong>内容</Text>
          <TextArea 
            value={editedEntry.content} 
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="条目内容"
            autoSize={{ minRows: 3, maxRows: 10 }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text strong>启用</Text>
            <Switch 
              checked={editedEntry.enabled} 
              onChange={(checked) => handleChange('enabled', checked)}
            />
          </Space>
          
          <Space>
            <Text strong>优先级</Text>
            <InputNumber 
              value={editedEntry.priority} 
              onChange={(value) => handleChange('priority', value)}
              min={0}
              max={100}
            />
          </Space>
        </div>
      </Space>
    </Card>
  );

  return isEditing ? renderEditMode() : renderViewMode();
};

export default WorldbookEntry;
