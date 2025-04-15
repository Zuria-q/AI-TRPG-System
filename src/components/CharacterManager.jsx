import React, { useState, useEffect } from 'react';
import { Tabs, Card, Button, message, Row, Col, Typography, Divider, Modal, Upload, Space, Tag, Tooltip, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ExportOutlined, ImportOutlined, UserOutlined, RobotOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import agentRegistry from '../agent_registry';
import CharacterCard from './CharacterCard';
import CharacterDetailEditor from './CharacterDetailEditor';
import LLMSelector from './LLMSelector';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Dragger } = Upload;

/**
 * 角色管理组件
 * 提供角色卡的总览、分类管理、编辑、导入导出等功能
 */
const CharacterManager = () => {
  // 状态管理
  const [agents, setAgents] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [charactersByType, setCharactersByType] = useState({
    player: [],
    gm: [],
    npc: []
  });

  // 加载所有角色数据
  useEffect(() => {
    loadCharacters();
  }, []);

  // 加载角色数据
  const loadCharacters = () => {
    setLoading(true);
    if (agentRegistry && typeof agentRegistry.getAllAgents === 'function') {
      try {
        const allAgents = agentRegistry.getAllAgents() || {};
        setAgents(allAgents);
        
        // 按类型分类角色
        const byType = {
          player: [],
          gm: [],
          npc: []
        };
        
        Object.values(allAgents).forEach(agent => {
          if (agent.type && byType[agent.type]) {
            byType[agent.type].push(agent);
          } else if (!agent.type) {
            // 如果没有类型，默认为NPC
            byType.npc.push({...agent, type: 'npc'});
          }
        });
        
        setCharactersByType(byType);
      } catch (error) {
        console.error('加载角色数据失败:', error, error.stack);
        message.error('加载角色数据失败: ' + error.message);
      } finally {
        setLoading(false);
      }
    } else {
      console.error('agentRegistry.getAllAgents 方法不存在');
      setLoading(false);
    }
  };

  // 创建新角色
  const handleCreateCharacter = (type = 'npc') => {
    try {
      // 创建基础角色数据
      const newAgent = {
        id: `agent_${Date.now()}`,
        name: type === 'player' ? '新玩家角色' : (type === 'gm' ? '新主持人角色' : '新NPC角色'),
        type: type,
        description: type === 'player' ? '由玩家控制的角色' : 
                    (type === 'gm' ? '负责推进故事的主持人' : '游戏中的NPC角色'),
        gender: '未设置',
        age: type === 'player' ? 25 : (type === 'gm' ? 0 : 30),
        role: type === 'player' ? '冒险者' : (type === 'gm' ? '游戏主持人' : 'NPC'),
        background: '',
        personality: {
          openness: 50,
          conscientiousness: 50,
          extraversion: 50,
          agreeableness: 50,
          neuroticism: 50
        },
        skills: [],
        relationships: [],
        behaviorTags: [],
        llmConfig: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2000
        }
      };
      
      // 注册到角色库
      agentRegistry.register(newAgent);
      message.success('新角色已创建');
      loadCharacters();
      
      // 打开编辑界面
      setSelectedCharacter(newAgent.id);
      setIsEditing(true);
      
      // 根据角色类型切换到对应标签页
      if (type === 'player') {
        setActiveTab('player');
      } else if (type === 'gm') {
        setActiveTab('gm');
      } else {
        setActiveTab('npc');
      }
    } catch (error) {
      console.error('创建角色失败:', error, error.stack);
      message.error('创建角色失败: ' + error.message);
    }
  };

  // 删除角色
  const handleDeleteCharacter = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个角色吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if (agentRegistry && typeof agentRegistry.remove === 'function') {
          try {
            agentRegistry.remove(id);
            message.success('角色已删除');
            loadCharacters();
            if (selectedCharacter === id) {
              setSelectedCharacter(null);
              setIsEditing(false);
            }
          } catch (error) {
            console.error('删除角色失败:', error);
            message.error('删除角色失败: ' + error.message);
          }
        }
      }
    });
  };

  // 编辑角色
  const handleEditCharacter = (id) => {
    setSelectedCharacter(id);
    setIsEditing(true);
  };

  // 导出角色
  const handleExportCharacter = (id) => {
    try {
      const character = agentRegistry.get(id);
      if (!character) {
        message.error('找不到角色数据');
        return;
      }

      // 创建导出对象，移除敏感信息
      const exportData = {
        ...character,
        llmConfig: {
          ...character.llmConfig,
          apiKey: '' // 不导出API密钥
        }
      };

      // 转换为JSON并下载
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `character-${character.name}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success('角色数据已导出');
    } catch (error) {
      console.error('导出角色失败:', error);
      message.error('导出角色失败: ' + error.message);
    }
  };

  // 处理导入
  const handleImport = (info) => {
    console.log('导入文件信息:', info);
    
    if (info.file) {
      try {
        // 获取文件对象
        let fileObj = null;
        
        // 检查文件对象
        if (info.file.originFileObj) {
          fileObj = info.file.originFileObj;
        } else if (info.fileList && info.fileList.length > 0 && info.fileList[0].originFileObj) {
          fileObj = info.fileList[0].originFileObj;
        } else if (info.file instanceof File || info.file instanceof Blob) {
          fileObj = info.file;
        }
        
        if (!fileObj) {
          console.error('无法获取有效的文件对象:', info);
          message.error('无法获取有效的文件对象，请重新上传');
          return;
        }
        
        console.log('使用文件对象:', fileObj);
        
        // 创建FileReader读取文件
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            // 检查读取结果
            if (!e.target || !e.target.result) {
              message.error('文件读取失败，请重试');
              return;
            }
            
            const content = e.target.result;
            console.log('文件内容长度:', content.length);
            
            // 尝试解析JSON
            let data;
            try {
              data = JSON.parse(content);
            } catch (jsonError) {
              console.error('JSON解析失败，尝试修复格式:', jsonError);
              
              // 尝试修复JSON格式问题
              let jsonStr = content;
              // 将单引号替换为双引号
              jsonStr = jsonStr.replace(/([\{\,]\s*)(')?([a-zA-Z0-9_]+)(')?(\s*:)/g, '$1"$3"$5');
              
              try {
                data = JSON.parse(jsonStr);
                console.log('JSON修复成功');
              } catch (fixError) {
                console.error('JSON修复失败:', fixError);
                message.error('JSON格式无效，无法解析文件');
                return;
              }
            }
            
            // 验证必要字段
            if (!data.name || !data.type) {
              message.error('导入的JSON缺少必要字段 (name, type)');
              return;
            }

            // 设置导入的数据
            const importData = {
              ...data,
              id: `agent_${Date.now()}` // 生成新ID避免冲突
            };
            
            console.log('导入数据准备完成:', importData.name);
            setImportedData(importData);
            setIsImporting(true);
          } catch (error) {
            console.error('解析文件内容失败:', error, error.stack);
            message.error(`导入失败: ${error.message}`);
          }
        };
        
        reader.onerror = (error) => {
          console.error('FileReader错误:', error);
          message.error('读取文件时发生错误');
        };
        
        // 读取文件内容
        reader.readAsText(fileObj);
      } catch (error) {
        console.error('文件处理错误:', error, error.stack);
        message.error(`文件处理错误: ${error.message}`);
      }
    } else {
      message.error('未选择文件');
    }
  };

  // 确认导入
  const confirmImport = () => {
    if (!importedData) return;

    try {
      if (typeof agentRegistry.register === 'function') {
        agentRegistry.register(importedData);
        message.success('角色已导入');
        loadCharacters();
        setIsImporting(false);
        setImportedData(null);
      }
    } catch (error) {
      console.error('导入角色失败:', error);
      message.error('导入角色失败: ' + error.message);
    }
  };

  // 关闭编辑模态框
  const handleCloseEdit = (refresh = false) => {
    setIsEditing(false);
    setSelectedCharacter(null);
    if (refresh) {
      loadCharacters();
    }
  };

  return (
    <div className="character-manager">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <span>
              <TeamOutlined />
              所有角色
            </span>
          } 
          key="all"
        >
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => handleCreateCharacter('player')}
              >
                添加玩家角色
              </Button>
              <Button 
                type="default" 
                icon={<PlusOutlined />} 
                onClick={() => handleCreateCharacter('gm')}
              >
                添加GM角色
              </Button>
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={() => handleCreateCharacter('npc')}
              >
                添加NPC角色
              </Button>
            </Space>
            
            <Button 
              type="default" 
              icon={<ImportOutlined />} 
              onClick={() => setIsImporting(true)}
            >
              导入角色
            </Button>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p>加载中...</p>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {Object.values(agents).length > 0 ? (
                Object.values(agents).map(character => (
                  <Col xs={24} sm={12} md={8} lg={6} key={character.id}>
                    <CharacterCard 
                      character={character}
                      onEdit={() => handleEditCharacter(character.id)}
                      onDelete={() => handleDeleteCharacter(character.id)}
                      onExport={() => handleExportCharacter(character.id)}
                    />
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <Empty 
                    description="暂无角色" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </Col>
              )}
            </Row>
          )}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <UserOutlined />
              玩家角色
            </span>
          } 
          key="player"
        >
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => handleCreateCharacter('player')}
            >
              添加玩家角色
            </Button>
            
            <Button 
              type="default" 
              icon={<ImportOutlined />} 
              onClick={() => setIsImporting(true)}
            >
              导入角色
            </Button>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p>加载中...</p>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {charactersByType.player.length > 0 ? (
                charactersByType.player.map(character => (
                  <Col xs={24} sm={12} md={8} lg={6} key={character.id}>
                    <CharacterCard 
                      character={character}
                      onEdit={() => handleEditCharacter(character.id)}
                      onDelete={() => handleDeleteCharacter(character.id)}
                      onExport={() => handleExportCharacter(character.id)}
                    />
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <Empty 
                    description="暂无玩家角色" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </Col>
              )}
            </Row>
          )}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <RobotOutlined />
              GM角色
            </span>
          } 
          key="gm"
        >
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => handleCreateCharacter('gm')}
            >
              添加GM角色
            </Button>
            
            <Button 
              type="default" 
              icon={<ImportOutlined />} 
              onClick={() => setIsImporting(true)}
            >
              导入角色
            </Button>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p>加载中...</p>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {charactersByType.gm.length > 0 ? (
                charactersByType.gm.map(character => (
                  <Col xs={24} sm={12} md={8} lg={6} key={character.id}>
                    <CharacterCard 
                      character={character}
                      onEdit={() => handleEditCharacter(character.id)}
                      onDelete={() => handleDeleteCharacter(character.id)}
                      onExport={() => handleExportCharacter(character.id)}
                    />
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <Empty 
                    description="暂无GM角色" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </Col>
              )}
            </Row>
          )}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <TeamOutlined />
              NPC角色
            </span>
          } 
          key="npc"
        >
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => handleCreateCharacter('npc')}
            >
              添加NPC角色
            </Button>
            
            <Button 
              type="default" 
              icon={<ImportOutlined />} 
              onClick={() => setIsImporting(true)}
            >
              导入角色
            </Button>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p>加载中...</p>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {charactersByType.npc.length > 0 ? (
                charactersByType.npc.map(character => (
                  <Col xs={24} sm={12} md={8} lg={6} key={character.id}>
                    <CharacterCard 
                      character={character}
                      onEdit={() => handleEditCharacter(character.id)}
                      onDelete={() => handleDeleteCharacter(character.id)}
                      onExport={() => handleExportCharacter(character.id)}
                    />
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <Empty 
                    description="暂无NPC角色" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </Col>
              )}
            </Row>
          )}
        </TabPane>
      </Tabs>

      {isEditing && selectedCharacter && (
        <Modal
          title="编辑角色"
          open={isEditing}
          onCancel={() => handleCloseEdit()}
          footer={null}
          width={800}
          destroyOnClose
        >
          <CharacterDetailEditor 
            agentId={selectedCharacter} 
            onClose={(refresh) => handleCloseEdit(refresh)}
          />
        </Modal>
      )}

      <Modal
        title="导入角色"
        open={isImporting}
        onCancel={() => {
          setIsImporting(false);
          setImportedData(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsImporting(false);
            setImportedData(null);
          }}>
            取消
          </Button>,
          <Button 
            key="import" 
            type="primary" 
            disabled={!importedData}
            onClick={confirmImport}
          >
            确认导入
          </Button>
        ]}
      >
        {!importedData ? (
          <Dragger
            name="character-json"
            accept=".json"
            beforeUpload={() => false}
            onChange={handleImport}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个JSON格式的角色卡文件
            </p>
          </Dragger>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Title level={4}>角色信息预览</Title>
              <p><strong>名称:</strong> {importedData.name}</p>
              <p><strong>类型:</strong> {
                importedData.type === 'player' ? '玩家角色' : 
                (importedData.type === 'gm' ? 'GM角色' : 'NPC')
              }</p>
              <p><strong>描述:</strong> {importedData.description || '无'}</p>
            </div>
            <Divider />
            <Text type="warning">注意: 导入将创建一个新角色，不会覆盖现有角色</Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CharacterManager;
