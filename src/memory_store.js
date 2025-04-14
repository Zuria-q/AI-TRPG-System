/**
 * Agent记忆存储系统
 * 管理每个角色的长期/短期记忆
 */
class MemoryStore {
  constructor() {
    // 记忆分类存储
    this.memories = {
      longTerm: new Map(),  // 长期记忆 (核心特征/重要事件)
      shortTerm: new Map(), // 短期记忆 (最近互动)
      facts: new Map()      // 事实记忆 (客观信息)
    };
    
    // 记忆容量配置
    this.capacity = {
      longTerm: 20,  // 长期记忆最大条数
      shortTerm: 10, // 短期记忆最大条数
      facts: 50      // 事实记忆最大条数
    };
    
    // 记忆权重配置 (用于记忆检索)
    this.weights = {
      recency: 0.6,   // 时间权重
      relevance: 0.3, // 相关权重
      importance: 0.1 // 重要权重
    };
  }

  /**
   * 添加记忆
   * @param {string} agentId - 角色ID
   * @param {string} type - 记忆类型 (longTerm/shortTerm/facts)
   * @param {Object} memory - 记忆内容
   * @param {number} [importance=1] - 重要性 (1-5)
   */
  addMemory(agentId, type, memory, importance = 1) {
    if (!this.memories[type]) {
      throw new Error(`无效的记忆类型: ${type}`);
    }
    
    // 初始化角色的记忆存储
    if (!this.memories[type].has(agentId)) {
      this.memories[type].set(agentId, []);
    }
    
    const agentMemories = this.memories[type].get(agentId);
    
    // 添加时间戳和重要性
    memory.timestamp = Date.now();
    memory.importance = Math.min(5, Math.max(1, importance));
    
    // 检查并维护容量
    if (agentMemories.length >= this.capacity[type]) {
      // 根据权重淘汰记忆
      agentMemories.sort((a, b) => this._calculateMemoryWeight(b) - this._calculateMemoryWeight(a));
      agentMemories.pop();
    }
    
    agentMemories.unshift(memory);
  }

  /**
   * 获取相关记忆
   * @param {string} agentId - 角色ID
   * @param {string} context - 当前上下文关键词
   * @param {number} [limit=5] - 返回记忆条数
   * @returns {Array} 相关记忆列表
   */
  getRelevantMemories(agentId, context, limit = 5) {
    const allMemories = [];
    
    // 合并所有记忆类型
    Object.values(this.memories).forEach(memoryMap => {
      if (memoryMap.has(agentId)) {
        allMemories.push(...memoryMap.get(agentId));
      }
    });
    
    // 计算相关性分数
    const scoredMemories = allMemories.map(memory => ({
      ...memory,
      score: this._calculateRelevanceScore(memory, context)
    }));
    
    // 按分数排序并限制数量
    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 计算记忆权重 (用于淘汰决策)
   * @private
   */
  _calculateMemoryWeight(memory) {
    const age = (Date.now() - memory.timestamp) / (1000 * 60 * 60); // 小时数
    return (
      this.weights.recency * (1 / Math.log(age + 1)) +
      this.weights.importance * (memory.importance / 5)
    );
  }

  /**
   * 计算记忆相关性分数
   * @private
   */
  _calculateRelevanceScore(memory, context) {
    // 简化实现 - 实际应使用更复杂的文本匹配
    const text = `${memory.title} ${memory.content}`.toLowerCase();
    const keywords = context.toLowerCase().split(/\s+/);
    
    let score = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 1;
      }
    });
    
    // 加入时间衰减因子 (越近的记忆分数越高)
    const ageHours = (Date.now() - memory.timestamp) / (1000 * 60 * 60);
    const timeDecay = 1 / (1 + Math.log(ageHours + 1));
    
    return score * timeDecay * (memory.importance / 5);
  }

  /**
   * 序列化记忆 (用于存档)
   * @returns {Object} 可序列化的记忆数据
   */
  serialize() {
    const data = {};
    
    Object.entries(this.memories).forEach(([type, memoryMap]) => {
      data[type] = Array.from(memoryMap.entries());
    });
    
    return data;
  }

  /**
   * 反序列化记忆 (用于读档)
   * @param {Object} data - 序列化的记忆数据
   */
  deserialize(data) {
    Object.entries(data).forEach(([type, entries]) => {
      this.memories[type] = new Map(entries);
    });
  }
}

// 单例模式导出
const memoryStore = new MemoryStore();
export default memoryStore;
