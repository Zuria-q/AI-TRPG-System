import memoryStore from './memory_store';
import llmIntegration from './llm_integration';

/**
 * 记忆摘要系统
 * 负责将游戏历史转化为角色记忆
 */
class MemorySummarizer {
  constructor() {
    this.summaryInterval = 5; // 每5回合执行一次摘要
    this.lastSummaryTurn = 0;
  }

  /**
   * 执行记忆摘要
   * @param {number} currentTurn - 当前回合数
   * @param {Array} history - 游戏历史记录
   */
  async summarizeHistory(currentTurn, history) {
    if (currentTurn - this.lastSummaryTurn < this.summaryInterval) {
      return;
    }
    
    try {
      // 按角色分组历史事件
      const eventsByAgent = this._groupEventsByAgent(history);
      
      // 为每个角色生成记忆
      for (const [agentId, events] of Object.entries(eventsByAgent)) {
        await this._generateMemories(agentId, events);
      }
      
      this.lastSummaryTurn = currentTurn;
    } catch (error) {
      console.error('记忆摘要失败:', error);
    }
  }

  /**
   * 按角色分组历史事件
   * @private
   */
  _groupEventsByAgent(history) {
    const groups = {};
    
    history.forEach(event => {
      // 处理事件参与者
      const involvedAgents = new Set();
      if (event.actorId) involvedAgents.add(event.actorId);
      if (event.targetId) involvedAgents.add(event.targetId);
      
      involvedAgents.forEach(agentId => {
        groups[agentId] = groups[agentId] || [];
        groups[agentId].push(event);
      });
    });
    
    return groups;
  }

  /**
   * 为角色生成记忆
   * @private
   */
  async _generateMemories(agentId, events) {
    // 生成原始记忆文本
    const memoryText = events.map(e => {
      return `[${e.turn}回合] ${e.actorId}${e.targetId ? '对' + e.targetId : ''}执行了${e.action.type}: ${e.action.description || ''}`;
    }).join('\n');
    
    // 调用LLM生成记忆摘要
    const summary = await llmIntegration.generateResponse('memory', {
      events: memoryText,
      agentId
    }, {
      model: 'gpt-3.5-turbo',
      temperature: 0.3, // 使用较低温度保证稳定性
      max_tokens: 200
    });
    
    // 解析记忆类型和重要性
    const { memoryType, importance } = this._classifyMemory(events);
    
    // 存储记忆
    memoryStore.addMemory(agentId, memoryType, {
      title: `${events.length}个相关事件摘要`,
      content: summary,
      events: events.map(e => e.turn)
    }, importance);
  }

  /**
   * 分类记忆类型和重要性
   * @private
   */
  _classifyMemory(events) {
    // 简化实现 - 实际应根据事件类型和频率判断
    const importantEvents = events.filter(e => 
      e.action.type === '对话' && e.action.motive === 'aggressive'
    );
    
    return {
      memoryType: importantEvents.length > 0 ? 'longTerm' : 'shortTerm',
      importance: Math.min(5, 1 + importantEvents.length)
    };
  }
}

// 单例模式导出
const memorySummarizer = new MemorySummarizer();
export default memorySummarizer;
