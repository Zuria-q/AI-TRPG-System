import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Space, Button, Modal, Input, Divider, message, Tooltip, Popconfirm } from 'antd';
import { DeleteOutlined, ExportOutlined, ImportOutlined, SaveOutlined, ClearOutlined, HistoryOutlined } from '@ant-design/icons';
import gameState from '../modules/game_state';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 聊天记录管理组件
 * 用于查看、导出、导入和清除聊天记录
 */
const ChatHistoryManager = () => {
  // 状态管理
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportData, setExportData] = useState('');

  // 加载聊天记录
  useEffect(() => {
    loadChatHistory();
  }, []);

  // 加载聊天记录
  const loadChatHistory = () => {
    try {
      let history = [];
      if (gameState.getChatHistory && typeof gameState.getChatHistory === 'function') {
        history = gameState.getChatHistory();
      } else {
        // 兼容旧版本
        const state = gameState.getState();
        history = state.chatHistory || [];
      }
      setChatHistory(history);
    } catch (error) {
      console.error('加载聊天记录失败:', error, error.stack);
      message.error('加载聊天记录失败');
    }
  };

  // 清除聊天记录
  const clearChatHistory = () => {
    try {
      if (gameState.clearChatHistory && typeof gameState.clearChatHistory === 'function') {
        gameState.clearChatHistory();
      } else {
        // 兼容旧版本
        gameState.updateState({
          chatHistory: []
        });
      }
      setChatHistory([]);
      message.success('聊天记录已清除');
    } catch (error) {
      console.error('清除聊天记录失败:', error, error.stack);
      message.error('清除聊天记录失败');
    }
  };

  // 导出聊天记录
  const exportChatHistory = () => {
    try {
      const exportObj = {
        chatHistory: chatHistory,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      setExportData(JSON.stringify(exportObj, null, 2));
      setIsExportModalVisible(true);
    } catch (error) {
      console.error('导出聊天记录失败:', error, error.stack);
      message.error('导出聊天记录失败');
    }
  };

  // 导入聊天记录
  const importChatHistory = (event) => {
    try {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const importedData = JSON.parse(content);
          
          if (!importedData.chatHistory || !Array.isArray(importedData.chatHistory)) {
            message.error('无效的聊天记录格式');
            return;
          }
          
          // 更新聊天记录
          if (gameState.updateState) {
            gameState.updateState({
              chatHistory: importedData.chatHistory
            });
          }
          
          setChatHistory(importedData.chatHistory);
          message.success('聊天记录导入成功');
        } catch (parseError) {
          console.error('解析导入文件失败:', parseError, parseError.stack);
          message.error('导入失败: 无效的JSON格式');
        }
      };
      
      reader.onerror = () => {
        message.error('读取文件失败');
      };
      
      reader.readAsText(file);
      
      // 重置文件输入，以便可以再次选择同一文件
      event.target.value = '';
    } catch (error) {
      console.error('导入聊天记录失败:', error, error.stack);
      message.error('导入聊天记录失败');
    }
  };

  // 编辑消息
  const editMessage = (message) => {
    setSelectedMessage(message);
    setEditedMessage(message.text);
    setIsModalVisible(true);
  };

  // 保存编辑后的消息
  const saveEditedMessage = () => {
    try {
      if (!selectedMessage) {
        return;
      }
      
      const updatedHistory = chatHistory.map(msg => 
        msg.id === selectedMessage.id ? { ...msg, text: editedMessage } : msg
      );
      
      // 更新聊天记录
      if (gameState.updateState) {
        gameState.updateState({
          chatHistory: updatedHistory
        });
      }
      
      setChatHistory(updatedHistory);
      setIsModalVisible(false);
      message.success('消息已更新');
    } catch (error) {
      console.error('更新消息失败:', error, error.stack);
      message.error('更新消息失败');
    }
  };

  // 删除消息
  const deleteMessage = (messageId) => {
    try {
      const updatedHistory = chatHistory.filter(msg => msg.id !== messageId);
      
      // 更新聊天记录
      if (gameState.updateState) {
        gameState.updateState({
          chatHistory: updatedHistory
        });
      }
      
      setChatHistory(updatedHistory);
      message.success('消息已删除');
    } catch (error) {
      console.error('删除消息失败:', error, error.stack);
      message.error('删除消息失败');
    }
  };

  // 获取消息类型的样式
  const getMessageStyle = (type) => {
    switch (type) {
      case 'player':
        return { backgroundColor: '#e6f7ff', borderLeft: '3px solid #1890ff' };
      case 'npc':
        return { backgroundColor: '#f6ffed', borderLeft: '3px solid #52c41a' };
      case 'system':
        return { backgroundColor: '#fff7e6', borderLeft: '3px solid #faad14' };
      default:
        return { backgroundColor: '#f5f5f5', borderLeft: '3px solid #d9d9d9' };
    }
  };

  // 渲染消息列表
  const renderChatList = () => (
    <List
      itemLayout="vertical"
      dataSource={chatHistory}
      renderItem={message => (
        <List.Item
          key={message.id || message.timestamp}
          style={{
            ...getMessageStyle(message.type),
            padding: '10px',
            marginBottom: '8px',
            borderRadius: '4px'
          }}
          actions={[
            <Button 
              icon={<SaveOutlined />} 
              size="small" 
              onClick={() => editMessage(message)}
            >
              编辑
            </Button>,
            <Popconfirm
              title="确定要删除这条消息吗？"
              onConfirm={() => deleteMessage(message.id || message.timestamp)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
              >
                删除
              </Button>
            </Popconfirm>
          ]}
        >
          <List.Item.Meta
            title={
              <Space>
                <Text strong>{message.senderName || '未知'}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {new Date(message.timestamp).toLocaleString()}
                </Text>
              </Space>
            }
          />
          <Paragraph>{message.text}</Paragraph>
        </List.Item>
      )}
    />
  );

  return (
    <Card title="聊天记录管理" extra={
      <Space>
        <Tooltip title="清除所有聊天记录">
          <Popconfirm
            title="确定要清除所有聊天记录吗？此操作不可撤销。"
            onConfirm={clearChatHistory}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<ClearOutlined />} danger>清除</Button>
          </Popconfirm>
        </Tooltip>
        <Tooltip title="导出聊天记录">
          <Button icon={<ExportOutlined />} onClick={exportChatHistory}>导出</Button>
        </Tooltip>
        <Tooltip title="导入聊天记录">
          <Button icon={<ImportOutlined />}>
            导入
            <input
              type="file"
              accept=".json"
              onChange={importChatHistory}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
          </Button>
        </Tooltip>
      </Space>
    }>
      {chatHistory.length > 0 ? (
        renderChatList()
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <HistoryOutlined style={{ fontSize: '32px', color: '#d9d9d9' }} />
          <p>暂无聊天记录</p>
        </div>
      )}

      {/* 编辑消息对话框 */}
      <Modal
        title="编辑消息"
        visible={isModalVisible}
        onOk={saveEditedMessage}
        onCancel={() => setIsModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <TextArea
          value={editedMessage}
          onChange={(e) => setEditedMessage(e.target.value)}
          rows={6}
        />
      </Modal>

      {/* 导出数据对话框 */}
      <Modal
        title="导出聊天记录"
        visible={isExportModalVisible}
        onOk={() => setIsExportModalVisible(false)}
        onCancel={() => setIsExportModalVisible(false)}
        okText="关闭"
        cancelText="取消"
      >
        <p>复制以下JSON数据或保存为文件：</p>
        <TextArea
          value={exportData}
          readOnly
          rows={10}
          onClick={(e) => e.target.select()}
        />
        <Divider />
        <Space>
          <Button
            type="primary"
            onClick={() => {
              try {
                navigator.clipboard.writeText(exportData);
                message.success('已复制到剪贴板');
              } catch (error) {
                console.error('复制失败:', error);
                message.error('复制失败');
              }
            }}
          >
            复制到剪贴板
          </Button>
          <Button
            onClick={() => {
              try {
                const blob = new Blob([exportData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat_history_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch (error) {
                console.error('保存文件失败:', error);
                message.error('保存文件失败');
              }
            }}
          >
            保存为文件
          </Button>
        </Space>
      </Modal>
    </Card>
  );
};

export default ChatHistoryManager;
