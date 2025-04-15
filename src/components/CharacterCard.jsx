import React from 'react';
import { Card, Typography, Tag, Space, Button, Tooltip, Avatar } from 'antd';
import { EditOutlined, DeleteOutlined, ExportOutlined, UserOutlined, RobotOutlined, TeamOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * 角色卡片组件
 * 用于在角色总览页面中展示角色的基本信息
 * 
 * @param {Object} props
 * @param {Object} props.character - 角色数据对象
 * @param {Function} props.onEdit - 编辑按钮点击回调
 * @param {Function} props.onDelete - 删除按钮点击回调
 * @param {Function} props.onExport - 导出按钮点击回调
 */
const CharacterCard = ({ character, onEdit, onDelete, onExport }) => {
  // 获取角色类型图标
  const getTypeIcon = (type) => {
    switch (type) {
      case 'player':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'gm':
        return <RobotOutlined style={{ color: '#52c41a' }} />;
      case 'npc':
      default:
        return <TeamOutlined style={{ color: '#faad14' }} />;
    }
  };

  // 获取角色类型标签
  const getTypeTag = (type) => {
    switch (type) {
      case 'player':
        return <Tag color="blue">玩家角色</Tag>;
      case 'gm':
        return <Tag color="green">游戏主持人</Tag>;
      case 'npc':
      default:
        return <Tag color="orange">NPC</Tag>;
    }
  };

  // 获取角色头像
  const getAvatar = (character) => {
    // 根据角色类型设置不同的头像样式
    const avatarIcon = character.type === 'player' ? <UserOutlined /> : 
                      (character.type === 'gm' ? <RobotOutlined /> : <TeamOutlined />);
    
    // 如果有自定义头像，则使用自定义头像
    if (character.avatar) {
      return <Avatar src={character.avatar} size={64} />;
    }
    
    // 否则使用默认图标
    return (
      <Avatar 
        size={64} 
        icon={avatarIcon}
        style={{ 
          backgroundColor: character.type === 'player' ? '#1890ff' : 
                          (character.type === 'gm' ? '#52c41a' : '#faad14') 
        }}
      />
    );
  };

  return (
    <Card
      hoverable
      className="character-card"
      cover={
        <div style={{ 
          padding: '16px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: '#f5f5f5'
        }}>
          {getAvatar(character)}
        </div>
      }
      actions={[
        <Tooltip title="编辑">
          <Button type="text" icon={<EditOutlined />} onClick={onEdit} />
        </Tooltip>,
        <Tooltip title="导出">
          <Button type="text" icon={<ExportOutlined />} onClick={onExport} />
        </Tooltip>,
        <Tooltip title="删除">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={onDelete} />
        </Tooltip>
      ]}
    >
      <div style={{ minHeight: '120px' }}>
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>{character.name}</Title>
            {getTypeIcon(character.type)}
          </div>
          
          <div>
            {getTypeTag(character.type)}
            {character.role && <Tag color="purple">{character.role}</Tag>}
          </div>
          
          <Paragraph 
            ellipsis={{ rows: 3, expandable: false }} 
            style={{ marginTop: 8, fontSize: '14px', color: 'rgba(0, 0, 0, 0.65)' }}
          >
            {character.description || '暂无描述'}
          </Paragraph>
          
          {character.personality && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                性格: 
                {character.personality.openness > 70 && <Tag size="small" color="blue">开放</Tag>}
                {character.personality.conscientiousness > 70 && <Tag size="small" color="green">尽责</Tag>}
                {character.personality.extraversion > 70 && <Tag size="small" color="gold">外向</Tag>}
                {character.personality.agreeableness > 70 && <Tag size="small" color="magenta">亲和</Tag>}
                {character.personality.neuroticism > 70 && <Tag size="small" color="red">敏感</Tag>}
              </Text>
            </div>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default CharacterCard;
