import React, { useState, useEffect } from 'react';
import storyEvaluator from '../modules/story_evaluator';
import novelGenerator from '../novel_generator';
import { Card, Button, Progress, Tabs, Collapse, Tag, Space, Typography, Divider, Alert, Spin, Modal, Select, Radio, List } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileTextOutlined, DownloadOutlined, LineChartOutlined, BookOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;

/**
 * 故事评估组件
 * 显示故事评估结果和小说生成选项
 */
const StoryEvaluator = ({ gameHistory, onExport }) => {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [novelConfig, setNovelConfig] = useState({
    format: 'markdown',
    chapterLength: 'medium',
    style: 'descriptive',
    perspective: 'third-person',
    tense: 'past',
    includeChapterSummaries: true
  });
  const [novelPreview, setNovelPreview] = useState(null);
  const [novelGenerating, setNovelGenerating] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  
  // 评估故事
  const evaluateStory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 将游戏历史转换为故事评估模块需要的格式
      const storyData = transformGameHistoryToStory(gameHistory);
      
      // 评估故事
      const result = storyEvaluator.evaluateStory(storyData);
      setEvaluation(result);
    } catch (err) {
      console.error('评估故事时出错:', err);
      setError('评估故事时出错: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 将游戏历史转换为故事评估模块需要的格式
  const transformGameHistoryToStory = (history) => {
    if (!history) {
      throw new Error('游戏历史不能为空');
    }
    
    // 提取角色信息
    const characters = {};
    if (history.characters) {
      history.characters.forEach(char => {
        characters[char.id] = {
          ...char,
          initialState: char.initialState || {},
          finalState: char.finalState || {},
          goals: char.goals || []
        };
      });
    }
    
    // 提取事件信息
    const events = history.messages ? history.messages.map((msg, index) => {
      return {
        id: msg.id || `event_${index}`,
        type: msg.type || 'dialogue',
        content: msg.content,
        character: msg.sender,
        timestamp: msg.timestamp || Date.now() - (history.messages.length - index) * 60000,
        location: msg.location || history.currentLocation || 'unknown'
      };
    }) : [];
    
    // 提取对话信息
    const dialogues = events.filter(e => e.type === 'dialogue');
    
    // 构建故事对象
    return {
      id: history.id || `story_${Date.now()}`,
      title: history.title || '无名冒险',
      characters,
      events,
      dialogues,
      conflicts: history.conflicts || [],
      theme: history.theme || { name: '冒险', keywords: ['冒险', '探索', '发现'] },
      protagonist: characters[history.protagonistId] || null,
      currentLocation: history.currentLocation || 'unknown',
      world: history.world || { name: '未知世界', description: '一个神秘的世界' }
    };
  };
  
  // 生成小说
  const generateNovel = async () => {
    setNovelGenerating(true);
    
    try {
      // 更新小说生成器配置
      novelGenerator.updateConfig(novelConfig);
      
      // 生成小说
      const novel = novelGenerator.generateNovel(transformGameHistoryToStory(gameHistory));
      
      // 生成预览
      const preview = novelGenerator.exportNovel(novel, novelConfig.format);
      setNovelPreview(preview);
      
      // 显示预览模态框
      setPreviewModalVisible(true);
    } catch (err) {
      console.error('生成小说时出错:', err);
      setError('生成小说时出错: ' + err.message);
    } finally {
      setNovelGenerating(false);
    }
  };
  
  // 导出小说
  const exportNovel = () => {
    if (!novelPreview) return;
    
    // 创建下载链接
    const blob = new Blob([novelPreview.content], { type: novelPreview.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gameHistory.title || '故事'}.${novelPreview.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // 渲染评分图表
  const renderScoreChart = () => {
    if (!evaluation || !evaluation.scores) return null;
    
    const data = Object.entries(evaluation.scores).map(([key, value]) => ({
      name: key,
      score: value.score * 100,
      weightedScore: value.weightedScore * 100
    }));
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
          <Legend />
          <Bar dataKey="score" name="原始分数" fill="#8884d8" />
          <Bar dataKey="weightedScore" name="加权分数" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // 渲染评估结果
  const renderEvaluation = () => {
    if (!evaluation) return null;
    
    const { overallScore, scores, endingType, recommendations } = evaluation;
    
    return (
      <div>
        <Card title="总体评分" bordered={false}>
          <Progress
            type="circle"
            percent={Math.round(overallScore * 100)}
            format={(percent) => `${percent}%`}
            status={overallScore >= 0.7 ? 'success' : overallScore >= 0.4 ? 'normal' : 'exception'}
          />
          <Divider />
          <Title level={4}>结局类型: {endingType.type}</Title>
          <Paragraph>{endingType.description}</Paragraph>
        </Card>
        
        <Divider />
        
        <Tabs defaultActiveKey="scores">
          <TabPane tab="详细评分" key="scores">
            {renderScoreChart()}
            <Divider />
            <Collapse defaultActiveKey={['coherence']}>
              {Object.entries(scores).map(([key, value]) => (
                <Panel 
                  header={
                    <Space>
                      <Text strong>{key}</Text>
                      <Progress 
                        percent={Math.round(value.score * 100)} 
                        size="small" 
                        status={value.score >= 0.7 ? 'success' : value.score >= 0.4 ? 'normal' : 'exception'}
                      />
                    </Space>
                  } 
                  key={key}
                >
                  <p><Text strong>描述: </Text>{value.description}</p>
                  <p><Text strong>权重: </Text>{value.weight}</p>
                  <p><Text strong>加权分数: </Text>{(value.weightedScore * 100).toFixed(1)}%</p>
                </Panel>
              ))}
            </Collapse>
          </TabPane>
          
          <TabPane tab="改进建议" key="recommendations">
            <List
              itemLayout="horizontal"
              dataSource={recommendations || []}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<CheckCircleOutlined style={{ color: '#1890ff', fontSize: '20px' }} />}
                    title={`建议 ${index + 1}`}
                    description={item}
                  />
                </List.Item>
              )}
            />
          </TabPane>
        </Tabs>
      </div>
    );
  };
  
  // 渲染小说生成选项
  const renderNovelOptions = () => {
    return (
      <Card title="小说生成选项" bordered={false}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>导出格式:</Text>
            <Select
              style={{ width: 200, marginLeft: 10 }}
              value={novelConfig.format}
              onChange={(value) => setNovelConfig({ ...novelConfig, format: value })}
            >
              <Option value="plainText">纯文本 (.txt)</Option>
              <Option value="markdown">Markdown (.md)</Option>
              <Option value="html">HTML (.html)</Option>
            </Select>
          </div>
          
          <div>
            <Text strong>章节长度:</Text>
            <Radio.Group
              value={novelConfig.chapterLength}
              onChange={(e) => setNovelConfig({ ...novelConfig, chapterLength: e.target.value })}
              style={{ marginLeft: 10 }}
            >
              <Radio value="short">短</Radio>
              <Radio value="medium">中</Radio>
              <Radio value="long">长</Radio>
            </Radio.Group>
          </div>
          
          <div>
            <Text strong>叙述风格:</Text>
            <Radio.Group
              value={novelConfig.style}
              onChange={(e) => setNovelConfig({ ...novelConfig, style: e.target.value })}
              style={{ marginLeft: 10 }}
            >
              <Radio value="descriptive">描述性</Radio>
              <Radio value="concise">简洁</Radio>
              <Radio value="dramatic">戏剧性</Radio>
            </Radio.Group>
          </div>
          
          <div>
            <Text strong>视角:</Text>
            <Radio.Group
              value={novelConfig.perspective}
              onChange={(e) => setNovelConfig({ ...novelConfig, perspective: e.target.value })}
              style={{ marginLeft: 10 }}
            >
              <Radio value="first-person">第一人称</Radio>
              <Radio value="third-person">第三人称</Radio>
            </Radio.Group>
          </div>
          
          <div>
            <Text strong>时态:</Text>
            <Radio.Group
              value={novelConfig.tense}
              onChange={(e) => setNovelConfig({ ...novelConfig, tense: e.target.value })}
              style={{ marginLeft: 10 }}
            >
              <Radio value="past">过去时</Radio>
              <Radio value="present">现在时</Radio>
            </Radio.Group>
          </div>
          
          <div>
            <Text strong>包含章节摘要:</Text>
            <Radio.Group
              value={novelConfig.includeChapterSummaries}
              onChange={(e) => setNovelConfig({ ...novelConfig, includeChapterSummaries: e.target.value })}
              style={{ marginLeft: 10 }}
            >
              <Radio value={true}>是</Radio>
              <Radio value={false}>否</Radio>
            </Radio.Group>
          </div>
          
          <Button 
            type="primary" 
            icon={<BookOutlined />} 
            onClick={generateNovel}
            loading={novelGenerating}
            disabled={!gameHistory || gameHistory.messages?.length === 0}
          >
            生成小说
          </Button>
        </Space>
      </Card>
    );
  };
  
  // 渲染小说预览模态框
  const renderPreviewModal = () => {
    if (!novelPreview) return null;
    
    return (
      <Modal
        title="小说预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={exportNovel}
          >
            下载
          </Button>
        ]}
      >
        <div style={{ maxHeight: '60vh', overflow: 'auto', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
          {novelConfig.format === 'html' ? (
            <div dangerouslySetInnerHTML={{ __html: novelPreview.content }} />
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {novelPreview.content}
            </pre>
          )}
        </div>
      </Modal>
    );
  };
  
  return (
    <div className="story-evaluator">
      {error && <Alert message="错误" description={error} type="error" showIcon closable />}
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Button 
              type="primary" 
              icon={<LineChartOutlined />} 
              onClick={evaluateStory}
              loading={loading}
              disabled={!gameHistory || gameHistory.messages?.length === 0}
            >
              评估故事
            </Button>
            <Text>
              {gameHistory?.messages?.length || 0} 条消息 | {gameHistory?.characters?.length || 0} 个角色
            </Text>
          </Space>
        </Card>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <p>正在评估故事...</p>
          </div>
        ) : evaluation ? (
          renderEvaluation()
        ) : (
          <Alert 
            message="提示" 
            description="点击评估故事按钮开始分析您的游戏故事质量和结构。" 
            type="info" 
            showIcon 
          />
        )}
        
        <Divider />
        
        {renderNovelOptions()}
        {renderPreviewModal()}
      </Space>
    </div>
  );
};

export default StoryEvaluator;
