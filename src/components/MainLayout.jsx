import React, { useState } from 'react';
import { Layout, Menu, Typography, ConfigProvider, theme, Switch } from 'antd';
import {
  ControlOutlined,
  BookOutlined,
  CommentOutlined,
  FileTextOutlined,
  UserOutlined,
  ApiOutlined,
  SettingOutlined,
  GlobalOutlined,
  TeamOutlined,
  NodeIndexOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

// 导入子组件
import UserManager from './UserManager';
import LLMManager from './LLMManager';
import MemorySystemSettings from './MemorySystemSettings';
import WorldSettingsEditor from './WorldSettingsEditor';
import WorldCardPanel from './WorldCardPanel';
import RelationshipEditor from './RelationshipEditor';
import MapEditor from './MapEditor';
import DialogueInterface from './DialogueInterface';
import StoryEvaluator from './StoryEvaluator';
import TimelineViewer from './TimelineViewer';
import MemoryLibrary from './MemoryLibrary';
import GameModeSelector from './GameModeSelector';
import CharacterManager from './CharacterManager';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

/**
 * 主布局组件
 * 整合所有子界面并提供导航
 */
function MainLayout() {
  // 状态
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('dialogue');
  const [darkMode, setDarkMode] = useState(true);
  
  // 菜单项配置
  const menuItems = [
    {
      key: 'control',
      icon: <ControlOutlined />,
      label: '控制面板',
      children: [
        {
          key: 'user',
          icon: <UserOutlined />,
          label: '用户管理'
        },
        {
          key: 'llm',
          icon: <ApiOutlined />,
          label: 'LLM管理'
        },
        {
          key: 'llm_params',
          icon: <SettingOutlined />,
          label: 'LLM参数'
        },
        {
          key: 'memory_settings',
          icon: <DatabaseOutlined />,
          label: '记忆系统设置'
        },
        {
          key: 'game_mode',
          icon: <UserOutlined />,
          label: '游戏模式'
        }
      ]
    },
    {
      key: 'game_settings',
      icon: <BookOutlined />,
      label: '游戏设定',
      children: [
        {
          key: 'world_settings',
          icon: <GlobalOutlined />,
          label: '世界观设定'
        },
        {
          key: 'character_cards',
          icon: <TeamOutlined />,
          label: '角色卡'
        },
        {
          key: 'relationships',
          icon: <NodeIndexOutlined />,
          label: '关系图谱'
        },
        {
          key: 'map',
          icon: <EnvironmentOutlined />,
          label: '地图'
        },
        {
          key: 'timeline',
          icon: <HistoryOutlined />,
          label: '时间线'
        },
        {
          key: 'memory_library',
          icon: <DatabaseOutlined />,
          label: '记忆库'
        }
      ]
    },
    {
      key: 'dialogue',
      icon: <CommentOutlined />,
      label: '体验界面'
    },
    {
      key: 'story',
      icon: <FileTextOutlined />,
      label: '故事评估与生成'
    }
  ];
  
  // 渲染当前选中的组件
  const renderContent = () => {
    switch (selectedKey) {
      case 'user':
        return <UserManager />;
      case 'llm':
        return <LLMManager />;
      case 'llm_params':
        return <div>LLM参数设置（待实现）</div>;
      case 'memory_settings':
        return <MemorySystemSettings />;
      case 'game_mode':
        return <GameModeSelector />;
      case 'world_settings':
        return <WorldSettingsEditor />;
      case 'character_cards':
        return <CharacterManager />;
      case 'relationships':
        return <RelationshipEditor />;
      case 'map':
        return <MapEditor />;
      case 'timeline':
        return <TimelineViewer />;
      case 'memory_library':
        return <MemoryLibrary />;
      case 'dialogue':
        return <DialogueInterface />;
      case 'story':
        return <StoryEvaluator />;
      default:
        return <DialogueInterface />;
    }
  };
  
  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#6a5acd',
          borderRadius: 4,
          colorBgContainer: darkMode ? '#1f1f1f' : '#ffffff',
          colorBgElevated: darkMode ? '#2a2a2a' : '#ffffff',
          colorText: darkMode ? '#e0e0e0' : '#333333',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: darkMode ? '#141414' : '#fff',
          borderBottom: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0, color: darkMode ? '#e0e0e0' : '#333' }}>
              AI-TRPG 叙事系统
            </Title>
          </div>
          <div>
            <Text style={{ marginRight: 8, color: darkMode ? '#e0e0e0' : '#333' }}>
              {darkMode ? '暗色模式' : '亮色模式'}
            </Text>
            <Switch 
              checked={darkMode} 
              onChange={setDarkMode} 
              checkedChildren="🌙" 
              unCheckedChildren="☀️" 
            />
          </div>
        </Header>
        <Layout>
          <Sider 
            collapsible 
            collapsed={collapsed} 
            onCollapse={setCollapsed}
            theme={darkMode ? 'dark' : 'light'}
            width={220}
            style={{
              overflow: 'auto',
              height: '100vh',
              position: 'sticky',
              top: 0,
              left: 0,
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              defaultOpenKeys={['control', 'game_settings']}
              style={{ height: '100%', borderRight: 0 }}
              items={menuItems}
              onClick={({ key }) => setSelectedKey(key)}
              theme={darkMode ? 'dark' : 'light'}
            />
          </Sider>
          <Content style={{ 
            margin: '16px', 
            padding: '16px', 
            background: darkMode ? '#141414' : '#fff',
            borderRadius: '4px',
            minHeight: 280,
            overflow: 'auto'
          }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default MainLayout;
