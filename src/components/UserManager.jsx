import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Table, Modal, Space, Typography, Avatar, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined, LogoutOutlined, LoginOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 用户管理组件
 * 用于管理不同的用户配置和切换
 */
function UserManager() {
  // 用户状态
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // 加载用户数据
  useEffect(() => {
    const savedUsers = localStorage.getItem('trpg_users');
    if (savedUsers) {
      try {
        const userList = JSON.parse(savedUsers);
        setUsers(userList);
        
        // 获取当前用户
        const currentUserId = localStorage.getItem('current_user_id');
        if (currentUserId) {
          const user = userList.find(u => u.id === currentUserId);
          if (user) {
            setCurrentUser(user);
          } else if (userList.length > 0) {
            setCurrentUser(userList[0]);
            localStorage.setItem('current_user_id', userList[0].id);
          }
        } else if (userList.length > 0) {
          setCurrentUser(userList[0]);
          localStorage.setItem('current_user_id', userList[0].id);
        }
      } catch (error) {
        console.error('加载用户数据失败:', error);
        message.error('加载用户数据失败');
      }
    }
  }, []);
  
  // 保存用户数据
  const saveUsers = (userList) => {
    try {
      localStorage.setItem('trpg_users', JSON.stringify(userList));
      setUsers(userList);
      message.success('用户数据已保存');
    } catch (error) {
      console.error('保存用户数据失败:', error);
      message.error('保存用户数据失败');
    }
  };
  
  // 添加新用户
  const addUser = (userData) => {
    const newUser = {
      ...userData,
      id: `user_${Date.now()}`,
      createdAt: new Date().toISOString(),
      settings: {
        theme: 'dark',
        language: 'zh-CN',
        defaultLLM: localStorage.getItem('default_llm') || ''
      }
    };
    
    const newUsers = [...users, newUser];
    saveUsers(newUsers);
    
    // 如果是第一个用户，设为当前用户
    if (newUsers.length === 1) {
      setCurrentUser(newUser);
      localStorage.setItem('current_user_id', newUser.id);
    }
    
    return newUser;
  };
  
  // 更新用户
  const updateUser = (id, updates) => {
    const newUsers = users.map(user => 
      user.id === id ? { ...user, ...updates, updatedAt: new Date().toISOString() } : user
    );
    saveUsers(newUsers);
    
    // 如果更新的是当前用户，更新当前用户状态
    if (currentUser && currentUser.id === id) {
      const updatedUser = newUsers.find(u => u.id === id);
      setCurrentUser(updatedUser);
    }
  };
  
  // 删除用户
  const deleteUser = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个用户吗？这将删除该用户的所有设置和偏好。',
      onOk: () => {
        const newUsers = users.filter(user => user.id !== id);
        saveUsers(newUsers);
        
        // 如果删除的是当前用户，切换到其他用户
        if (currentUser && currentUser.id === id) {
          if (newUsers.length > 0) {
            setCurrentUser(newUsers[0]);
            localStorage.setItem('current_user_id', newUsers[0].id);
          } else {
            setCurrentUser(null);
            localStorage.removeItem('current_user_id');
          }
        }
      }
    });
  };
  
  // 切换用户
  const switchUser = (id) => {
    const user = users.find(u => u.id === id);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('current_user_id', id);
      message.success(`已切换到用户: ${user.name}`);
      
      // 应用用户设置
      if (user.settings) {
        // 这里可以添加应用用户设置的逻辑
        // 例如切换主题、语言等
      }
    }
  };
  
  // 渲染用户表格
  const renderUserTable = () => {
    const columns = [
      {
        title: '用户',
        key: 'user',
        render: (_, record) => (
          <Space>
            <Avatar 
              icon={<UserOutlined />} 
              style={{ 
                backgroundColor: record.id === currentUser?.id ? '#1890ff' : '#ccc' 
              }}
            />
            <span>{record.name}</span>
            {record.id === currentUser?.id && (
              <Text type="success">(当前)</Text>
            )}
          </Space>
        )
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Space>
            {record.id !== currentUser?.id && (
              <Button 
                icon={<LoginOutlined />} 
                size="small" 
                onClick={() => switchUser(record.id)}
              >
                切换
              </Button>
            )}
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={() => setEditingUser(record)}
            />
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              onClick={() => deleteUser(record.id)}
              disabled={users.length <= 1 && record.id === currentUser?.id}
            />
          </Space>
        )
      }
    ];
    
    return (
      <Table 
        dataSource={users} 
        columns={columns} 
        rowKey="id"
        pagination={false}
        size="small"
      />
    );
  };
  
  // 渲染添加/编辑用户模态框
  const renderUserModal = () => {
    const [form] = Form.useForm();
    const isEditing = !!editingUser;
    
    // 初始化表单
    useEffect(() => {
      if (editingUser) {
        form.setFieldsValue({
          name: editingUser.name,
          email: editingUser.email,
          avatar: editingUser.avatar
        });
      } else {
        form.resetFields();
      }
    }, [form, editingUser, showAddModal]);
    
    // 提交表单
    const handleSubmit = () => {
      form.validateFields()
        .then(values => {
          if (isEditing) {
            updateUser(editingUser.id, values);
            setEditingUser(null);
          } else {
            addUser(values);
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
        setEditingUser(null);
      } else {
        setShowAddModal(false);
      }
      form.resetFields();
    };
    
    return (
      <Modal
        title={isEditing ? '编辑用户' : '添加用户'}
        open={isEditing || showAddModal}
        onOk={handleSubmit}
        onCancel={handleCancel}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="输入用户名" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
              { required: true, message: '请输入邮箱' }
            ]}
          >
            <Input placeholder="输入邮箱" />
          </Form.Item>
          
          <Form.Item
            name="avatar"
            label="头像URL"
          >
            <Input placeholder="可选，输入头像图片URL" />
          </Form.Item>
        </Form>
      </Modal>
    );
  };
  
  // 当前用户信息卡片
  const renderCurrentUserCard = () => {
    if (!currentUser) return null;
    
    return (
      <Card 
        size="small" 
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <Avatar 
              icon={<UserOutlined />} 
              src={currentUser.avatar}
              style={{ backgroundColor: '#1890ff' }}
            />
            <span>{currentUser.name}</span>
          </Space>
        }
        extra={
          <Button 
            icon={<LogoutOutlined />} 
            size="small"
            onClick={() => {
              setCurrentUser(null);
              localStorage.removeItem('current_user_id');
              message.info('已退出登录');
            }}
            disabled={users.length <= 1}
          >
            退出
          </Button>
        }
      >
        <div>
          <Text type="secondary">邮箱: </Text>
          <Text>{currentUser.email}</Text>
        </div>
        <div>
          <Text type="secondary">创建时间: </Text>
          <Text>{new Date(currentUser.createdAt).toLocaleString()}</Text>
        </div>
      </Card>
    );
  };
  
  return (
    <div className="user-manager">
      {renderCurrentUserCard()}
      
      <Card 
        title="用户管理" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setShowAddModal(true)}
          >
            添加用户
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            管理不同的用户配置，每个用户可以有自己的设置和偏好。
          </Text>
        </div>
        
        {users.length > 0 ? (
          renderUserTable()
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Text type="secondary">还没有添加任何用户</Text>
            <div style={{ marginTop: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setShowAddModal(true)}
              >
                添加第一个用户
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {renderUserModal()}
    </div>
  );
}

export default UserManager;
