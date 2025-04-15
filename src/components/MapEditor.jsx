// MapEditor.jsx 的主要结构
import React, { useState, useEffect, useRef } from 'react';
import { gameState, agentRegistry } from '@/modules/index';
import { Stage, Layer, Rect, Circle, Text, Line, Arrow, Image as KonvaImage } from 'react-konva';
import { Button, Select, Input, Tabs, Form, Modal, Upload, message, Tooltip, Card, Collapse, Switch, Slider, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;

/**
 * 地图编辑器组件
 * 用于创建和编辑游戏世界地图
 */
const MapEditor = ({ onSave }) => {
  // 状态定义
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [newLocation, setNewLocation] = useState({ name: '', description: '', x: 0, y: 0, type: 'city' });
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [editingConnection, setEditingConnection] = useState(null);
  const [newConnection, setNewConnection] = useState({ source: '', target: '', type: 'road', difficulty: 'easy' });
  const [mapImage, setMapImage] = useState(null);
  const [mapScale, setMapScale] = useState(1);
  const [mapMode, setMapMode] = useState('edit'); // edit, view
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const stageRef = useRef(null);

  // 加载地图数据
  useEffect(() => {
    try {
      if (gameState && typeof gameState.getState === 'function') {
        const state = gameState.getState();
        if (state && state.world && state.world.locations) {
          // 转换位置数据
          const locationData = Object.values(state.world.locations).map(loc => ({
            id: loc.id || `loc_${Date.now()}`,
            name: loc.name || '未命名位置',
            description: loc.description || '',
            x: loc.x || 0,
            y: loc.y || 0,
            type: loc.type || 'city',
            color: loc.color || '#3498db',
            size: loc.size || 20
          }));
          setLocations(locationData);
          
          // 转换连接数据
          if (state.world.connections) {
            setConnections(state.world.connections);
          } else {
            // 尝试从出口数据生成连接
            const generatedConnections = [];
            locationData.forEach(loc => {
              if (state.world.locations[loc.id] && state.world.locations[loc.id].exits) {
                state.world.locations[loc.id].exits.forEach(exitId => {
                  // 避免重复添加连接
                  const exists = generatedConnections.some(
                    conn => (conn.source === loc.id && conn.target === exitId) || 
                            (conn.source === exitId && conn.target === loc.id)
                  );
                  
                  if (!exists) {
                    generatedConnections.push({
                      id: `conn_${loc.id}_${exitId}`,
                      source: loc.id,
                      target: exitId,
                      type: 'road',
                      difficulty: 'easy'
                    });
                  }
                });
              }
            });
            setConnections(generatedConnections);
          }
          
          // 加载地图背景
          if (state.world.mapImage) {
            setMapImage(state.world.mapImage);
          }
          
          // 加载地图比例
          if (state.world.mapScale) {
            setMapScale(state.world.mapScale);
          }
        }
      }
    } catch (error) {
      console.error('加载地图数据失败:', error);
    }
  }, []);

  // 保存地图数据
  const saveMap = () => {
    try {
      if (gameState && typeof gameState.updateWorldSettings === 'function') {
        // 转换位置数据为对象格式
        const locationsObj = {};
        locations.forEach(loc => {
          locationsObj[loc.id] = {
            ...loc,
            exits: connections
              .filter(conn => conn.source === loc.id || conn.target === loc.id)
              .map(conn => conn.source === loc.id ? conn.target : conn.source)
          };
        });
        
        // 更新世界设置
        gameState.updateWorldSettings({
          locations: locationsObj,
          connections,
          mapImage,
          mapScale
        });
        
        message.success('地图已保存');
        if (onSave) onSave({ locations: locationsObj, connections });
      } else {
        message.error('保存失败: gameState未定义或方法不可用');
      }
    } catch (error) {
      console.error('保存地图失败:', error);
      message.error('保存失败: ' + error.message);
    }
  };

  // 添加新位置
  const addLocation = () => {
    if (!newLocation.name) {
      message.warning('位置名称不能为空');
      return;
    }
    
    const newLoc = {
      ...newLocation,
      id: `loc_${Date.now()}`,
      color: getLocationColor(newLocation.type),
      size: getLocationSize(newLocation.type)
    };
    
    setLocations([...locations, newLoc]);
    setNewLocation({ name: '', description: '', x: 0, y: 0, type: 'city' });
  };

  // 更新位置
  const updateLocation = () => {
    if (!editingLocation) return;
    
    setLocations(locations.map(loc => 
      loc.id === editingLocation.id ? editingLocation : loc
    ));
    setEditingLocation(null);
  };

  // 删除位置
  const deleteLocation = (locId) => {
    setLocations(locations.filter(loc => loc.id !== locId));
    // 同时删除相关的连接
    setConnections(connections.filter(conn => 
      conn.source !== locId && conn.target !== locId
    ));
  };

  // 添加新连接
  const addConnection = () => {
    if (!newConnection.source || !newConnection.target) {
      message.warning('必须选择起点和终点');
      return;
    }
    
    if (newConnection.source === newConnection.target) {
      message.warning('起点和终点不能相同');
      return;
    }
    
    // 检查是否已存在相同的连接
    const exists = connections.some(
      conn => (conn.source === newConnection.source && conn.target === newConnection.target) ||
              (conn.source === newConnection.target && conn.target === newConnection.source)
    );
    
    if (exists) {
      message.warning('该连接已存在');
      return;
    }
    
    const newConn = {
      ...newConnection,
      id: `conn_${newConnection.source}_${newConnection.target}`
    };
    
    setConnections([...connections, newConn]);
    setNewConnection({ source: '', target: '', type: 'road', difficulty: 'easy' });
  };

  // 更新连接
  const updateConnection = () => {
    if (!editingConnection) return;
    
    setConnections(connections.map(conn => 
      conn.id === editingConnection.id ? editingConnection : conn
    ));
    setEditingConnection(null);
  };

  // 删除连接
  const deleteConnection = (connId) => {
    setConnections(connections.filter(conn => conn.id !== connId));
  };

  // 根据位置类型获取颜色
  const getLocationColor = (type) => {
    const colors = {
      city: '#3498db',
      town: '#2ecc71',
      village: '#f1c40f',
      dungeon: '#e74c3c',
      landmark: '#9b59b6',
      camp: '#e67e22',
      ruins: '#95a5a6',
      other: '#34495e'
    };
    return colors[type] || colors.other;
  };

  // 根据位置类型获取大小
  const getLocationSize = (type) => {
    const sizes = {
      city: 25,
      town: 20,
      village: 15,
      dungeon: 18,
      landmark: 20,
      camp: 15,
      ruins: 18,
      other: 15
    };
    return sizes[type] || sizes.other;
  };
  
  // 获取连接线颜色
  const getConnectionColor = (type, difficulty) => {
    const colors = {
      road: {
        easy: '#2ecc71',
        normal: '#f1c40f',
        hard: '#e74c3c'
      },
      river: {
        easy: '#3498db',
        normal: '#2980b9',
        hard: '#1a5276'
      },
      path: {
        easy: '#95a5a6',
        normal: '#7f8c8d',
        hard: '#2c3e50'
      }
    };
    return colors[type]?.[difficulty] || '#7f8c8d';
  };
  
  // 获取连接线宽度
  const getConnectionWidth = (type) => {
    const widths = {
      road: 3,
      river: 4,
      path: 2
    };
    return widths[type] || 2;
  };
  
  // 获取连接线虚线样式
  const getConnectionDash = (type) => {
    return type === 'path' ? [5, 2] : [];
  };
  
  // 渲染网格
  const renderGrid = () => {
    const gridLines = [];
    const width = 800;
    const height = 600;
    
    for (let i = 0; i <= width; i += gridSize) {
      gridLines.push(
        <Line
          key={`v${i}`}
          points={[i, 0, i, height]}
          stroke="#ccc"
          strokeWidth={0.5}
          opacity={0.3}
        />
      );
    }
    
    for (let i = 0; i <= height; i += gridSize) {
      gridLines.push(
        <Line
          key={`h${i}`}
          points={[0, i, width, i]}
          stroke="#ccc"
          strokeWidth={0.5}
          opacity={0.3}
        />
      );
    }
    
    return gridLines;
  };
  
  // 鼠标事件处理函数
  const handleStageMouseDown = (e) => {
    // 阻止事件冒泡
    e.evt.preventDefault();
    
    // 如果不是编辑模式，不处理
    if (mapMode !== 'edit') return;
    
    // 获取点击位置
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const x = pointerPosition.x;
    const y = pointerPosition.y;
    
    // 检查是否点击了某个位置
    const clickedOnEmpty = e.target === stage;
    
    // 如果点击了空白处，取消选择
    if (clickedOnEmpty) {
      setSelectedLocation(null);
      setSelectedConnection(null);
    }
  };
  
  // 鼠标移动事件
  const handleStageMouseMove = (e) => {
    // 如果不是编辑模式，不处理
    if (mapMode !== 'edit') return;
    
    // 这里可以添加拖动逻辑
  };
  
  // 鼠标释放事件
  const handleStageMouseUp = () => {
    // 如果不是编辑模式，不处理
    if (mapMode !== 'edit') return;
    
    // 这里可以添加拖动结束逻辑
  };
  
  // 位置点击事件
  const handleLocationClick = (loc) => {
    setSelectedLocation(loc);
    setSelectedConnection(null);
  };
  
  // 位置拖动事件
  const handleLocationDrag = (e) => {
    if (mapMode !== 'edit') return;
    
    const id = e.target.id();
    const { x, y } = e.target.position();
    
    // 更新位置
    setLocations(locations.map(loc => 
      loc.id === id ? { ...loc, x, y } : loc
    ));
  };
  
  // 位置拖动结束事件
  const handleLocationDragEnd = (e) => {
    if (mapMode !== 'edit') return;
    
    // 可以在这里添加拖动结束后的逻辑
  };
  
  // 连接点击事件
  const handleConnectionClick = (conn) => {
    setSelectedConnection(conn);
    setSelectedLocation(null);
  };
  
  // 渲染位置面板
  const renderLocationsPanel = () => {
    return (
      <div className="space-y-4">
        {/* 位置列表 */}
        <div className="max-h-60 overflow-y-auto">
          {locations.map(loc => (
            <div 
              key={loc.id}
              className={`p-2 border-b cursor-pointer ${selectedLocation?.id === loc.id ? 'bg-blue-100' : ''}`}
              onClick={() => handleLocationClick(loc)}
            >
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: loc.color }}
                ></div>
                <div className="flex-1">{loc.name}</div>
                <div className="text-xs text-gray-500">{loc.type}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 新增位置表单 */}
        <div className="border p-3 rounded">
          <h4 className="font-medium mb-2">添加新位置</h4>
          <div className="space-y-2">
            <Input 
              placeholder="位置名称" 
              value={newLocation.name}
              onChange={e => setNewLocation({...newLocation, name: e.target.value})}
            />
            <Input.TextArea 
              placeholder="位置描述" 
              value={newLocation.description}
              onChange={e => setNewLocation({...newLocation, description: e.target.value})}
              rows={2}
            />
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input 
                  placeholder="X坐标" 
                  type="number"
                  value={newLocation.x}
                  onChange={e => setNewLocation({...newLocation, x: Number(e.target.value)})}
                />
              </div>
              <div className="flex-1">
                <Input 
                  placeholder="Y坐标" 
                  type="number"
                  value={newLocation.y}
                  onChange={e => setNewLocation({...newLocation, y: Number(e.target.value)})}
                />
              </div>
            </div>
            <Select
              placeholder="位置类型"
              style={{ width: '100%' }}
              value={newLocation.type}
              onChange={value => setNewLocation({...newLocation, type: value})}
            >
              <Option value="city">城市</Option>
              <Option value="town">城镇</Option>
              <Option value="village">村庄</Option>
              <Option value="dungeon">地牢</Option>
              <Option value="landmark">地标</Option>
              <Option value="camp">营地</Option>
              <Option value="ruins">废墟</Option>
              <Option value="other">其他</Option>
            </Select>
            <Button 
              type="primary" 
              block 
              icon={<PlusOutlined />}
              onClick={addLocation}
            >
              添加位置
            </Button>
          </div>
        </div>
        
        {/* 编辑位置表单 */}
        {selectedLocation && (
          <div className="border p-3 rounded">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">编辑位置</h4>
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => deleteLocation(selectedLocation.id)}
                size="small"
              >
                删除
              </Button>
            </div>
            <div className="space-y-2">
              <Input 
                placeholder="位置名称" 
                value={selectedLocation.name}
                onChange={e => setSelectedLocation({...selectedLocation, name: e.target.value})}
              />
              <Input.TextArea 
                placeholder="位置描述" 
                value={selectedLocation.description}
                onChange={e => setSelectedLocation({...selectedLocation, description: e.target.value})}
                rows={2}
              />
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input 
                    placeholder="X坐标" 
                    type="number"
                    value={selectedLocation.x}
                    onChange={e => setSelectedLocation({...selectedLocation, x: Number(e.target.value)})}
                  />
                </div>
                <div className="flex-1">
                  <Input 
                    placeholder="Y坐标" 
                    type="number"
                    value={selectedLocation.y}
                    onChange={e => setSelectedLocation({...selectedLocation, y: Number(e.target.value)})}
                  />
                </div>
              </div>
              <Select
                placeholder="位置类型"
                style={{ width: '100%' }}
                value={selectedLocation.type}
                onChange={value => setSelectedLocation({...selectedLocation, type: value})}
              >
                <Option value="city">城市</Option>
                <Option value="town">城镇</Option>
                <Option value="village">村庄</Option>
                <Option value="dungeon">地牢</Option>
                <Option value="landmark">地标</Option>
                <Option value="camp">营地</Option>
                <Option value="ruins">废墟</Option>
                <Option value="other">其他</Option>
              </Select>
              <Button 
                type="primary" 
                block 
                icon={<SaveOutlined />}
                onClick={updateLocation}
              >
                保存更改
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // 渲染连接面板
  const renderConnectionsPanel = () => {
    return (
      <div className="space-y-4">
        {/* 连接列表 */}
        <div className="max-h-60 overflow-y-auto">
          {connections.map(conn => {
            const source = locations.find(loc => loc.id === conn.source);
            const target = locations.find(loc => loc.id === conn.target);
            if (!source || !target) return null;
            
            return (
              <div 
                key={conn.id}
                className={`p-2 border-b cursor-pointer ${selectedConnection?.id === conn.id ? 'bg-blue-100' : ''}`}
                onClick={() => handleConnectionClick(conn)}
              >
                <div className="flex items-center">
                  <div 
                    className="w-4 h-1 mr-2" 
                    style={{ backgroundColor: getConnectionColor(conn.type, conn.difficulty) }}
                  ></div>
                  <div className="flex-1">{source.name} → {target.name}</div>
                  <div className="text-xs text-gray-500">{conn.type}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 新增连接表单 */}
        <div className="border p-3 rounded">
          <h4 className="font-medium mb-2">添加新连接</h4>
          <div className="space-y-2">
            <Select
              placeholder="起点位置"
              style={{ width: '100%' }}
              value={newConnection.source}
              onChange={value => setNewConnection({...newConnection, source: value})}
            >
              {locations.map(loc => (
                <Option key={loc.id} value={loc.id}>{loc.name}</Option>
              ))}
            </Select>
            <Select
              placeholder="终点位置"
              style={{ width: '100%' }}
              value={newConnection.target}
              onChange={value => setNewConnection({...newConnection, target: value})}
            >
              {locations.map(loc => (
                <Option key={loc.id} value={loc.id}>{loc.name}</Option>
              ))}
            </Select>
            <Select
              placeholder="连接类型"
              style={{ width: '100%' }}
              value={newConnection.type}
              onChange={value => setNewConnection({...newConnection, type: value})}
            >
              <Option value="road">道路</Option>
              <Option value="river">河流</Option>
              <Option value="path">小路</Option>
            </Select>
            <Select
              placeholder="难度"
              style={{ width: '100%' }}
              value={newConnection.difficulty}
              onChange={value => setNewConnection({...newConnection, difficulty: value})}
            >
              <Option value="easy">简单</Option>
              <Option value="normal">一般</Option>
              <Option value="hard">困难</Option>
            </Select>
            <Button 
              type="primary" 
              block 
              icon={<PlusOutlined />}
              onClick={addConnection}
            >
              添加连接
            </Button>
          </div>
        </div>
        
        {/* 编辑连接表单 */}
        {selectedConnection && (
          <div className="border p-3 rounded">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">编辑连接</h4>
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => deleteConnection(selectedConnection.id)}
                size="small"
              >
                删除
              </Button>
            </div>
            <div className="space-y-2">
              <Select
                placeholder="连接类型"
                style={{ width: '100%' }}
                value={selectedConnection.type}
                onChange={value => setSelectedConnection({...selectedConnection, type: value})}
              >
                <Option value="road">道路</Option>
                <Option value="river">河流</Option>
                <Option value="path">小路</Option>
              </Select>
              <Select
                placeholder="难度"
                style={{ width: '100%' }}
                value={selectedConnection.difficulty}
                onChange={value => setSelectedConnection({...selectedConnection, difficulty: value})}
              >
                <Option value="easy">简单</Option>
                <Option value="normal">一般</Option>
                <Option value="hard">困难</Option>
              </Select>
              <Button 
                type="primary" 
                block 
                icon={<SaveOutlined />}
                onClick={updateConnection}
              >
                保存更改
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // 渲染设置面板
  const renderSettingsPanel = () => {
    return (
      <div className="space-y-4">
        <div className="border p-3 rounded">
          <h4 className="font-medium mb-2">地图设置</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>显示网格</span>
              <Switch 
                checked={showGrid} 
                onChange={setShowGrid} 
              />
            </div>
            <div className="flex items-center">
              <span className="mr-2">网格大小</span>
              <Slider 
                min={10} 
                max={50} 
                value={gridSize} 
                onChange={setGridSize} 
                style={{ flex: 1 }} 
              />
              <InputNumber 
                min={10} 
                max={50} 
                value={gridSize} 
                onChange={setGridSize} 
                style={{ width: 60, marginLeft: 8 }} 
              />
            </div>
            <div className="flex items-center">
              <span className="mr-2">缩放比例</span>
              <Slider 
                min={0.5} 
                max={2} 
                step={0.1} 
                value={mapScale} 
                onChange={setMapScale} 
                style={{ flex: 1 }} 
              />
              <InputNumber 
                min={0.5} 
                max={2} 
                step={0.1} 
                value={mapScale} 
                onChange={setMapScale} 
                style={{ width: 60, marginLeft: 8 }} 
              />
            </div>
          </div>
        </div>
        
        <div className="border p-3 rounded">
          <h4 className="font-medium mb-2">背景图片</h4>
          <div className="space-y-2">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const img = new Image();
                  img.src = e.target.result;
                  img.onload = () => {
                    setMapImage(img);
                  };
                };
                reader.readAsDataURL(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>上传背景图</Button>
            </Upload>
            {mapImage && (
              <Button 
                danger 
                onClick={() => setMapImage(null)}
              >
                移除背景图
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染地图编辑器
  return (
    <div className="map-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>地图编辑器</h2>
        <div>
          <Button 
            type={mapMode === 'edit' ? 'primary' : 'default'} 
            onClick={() => setMapMode('edit')}
            style={{ marginRight: 8 }}
          >
            编辑模式
          </Button>
          <Button 
            type={mapMode === 'view' ? 'primary' : 'default'} 
            onClick={() => setMapMode('view')}
            style={{ marginRight: 8 }}
          >
            查看模式
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={saveMap}>
            保存地图
          </Button>
        </div>
      </div>
      
      <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
        {/* 地图画布 */}
        <div style={{ flex: 3, border: '1px solid #ccc', position: 'relative' }}>
          <Stage
            width={800}
            height={600}
            ref={stageRef}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
          >
            <Layer>
              {/* 背景图片 */}
              {mapImage && (
                <KonvaImage
                  image={mapImage}
                  width={800}
                  height={600}
                  opacity={0.5}
                />
              )}
              
              {/* 网格 */}
              {showGrid && renderGrid()}
              
              {/* 连接线 */}
              {connections.map(conn => {
                const source = locations.find(loc => loc.id === conn.source);
                const target = locations.find(loc => loc.id === conn.target);
                if (!source || !target) return null;
                
                return (
                  <Arrow
                    key={conn.id}
                    points={[source.x, source.y, target.x, target.y]}
                    stroke={getConnectionColor(conn.type, conn.difficulty)}
                    strokeWidth={getConnectionWidth(conn.type)}
                    dash={getConnectionDash(conn.type)}
                    fill={getConnectionColor(conn.type, conn.difficulty)}
                    onClick={() => handleConnectionClick(conn)}
                    onTap={() => handleConnectionClick(conn)}
                    opacity={selectedConnection?.id === conn.id ? 1 : 0.7}
                  />
                );
              })}
              
              {/* 位置点 */}
              {locations.map(loc => (
                <React.Fragment key={loc.id}>
                  <Circle
                    x={loc.x}
                    y={loc.y}
                    radius={loc.size}
                    fill={loc.color}
                    stroke={selectedLocation?.id === loc.id ? '#000' : loc.color}
                    strokeWidth={selectedLocation?.id === loc.id ? 2 : 0}
                    draggable={mapMode === 'edit'}
                    onClick={() => handleLocationClick(loc)}
                    onTap={() => handleLocationClick(loc)}
                    onDragMove={handleLocationDrag}
                    onDragEnd={handleLocationDragEnd}
                  />
                  <Text
                    x={loc.x - 50}
                    y={loc.y + loc.size + 5}
                    width={100}
                    text={loc.name}
                    fontSize={12}
                    fill="#fff"
                    align="center"
                  />
                </React.Fragment>
              ))}
            </Layer>
          </Stage>
        </div>
        
        {/* 编辑面板 */}
        <div style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
          <Tabs defaultActiveKey="locations">
            <TabPane tab="位置" key="locations">
              {/* 位置列表和编辑表单 */}
              {renderLocationsPanel()}
            </TabPane>
            <TabPane tab="连接" key="connections">
              {/* 连接列表和编辑表单 */}
              {renderConnectionsPanel()}
            </TabPane>
            <TabPane tab="设置" key="settings">
              {/* 地图设置 */}
              {renderSettingsPanel()}
            </TabPane>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MapEditor;
