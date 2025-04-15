/**
 * 增强型记忆存储系统
 * 支持基于嵌入向量的相似度检索、记忆分类和记忆衰减
 */
class MemoryStore {
  constructor() {
    // 记忆存储
    this.memories = [];
    
    // 分类存储
    this.categories = {
      'general': { name: '一般记忆', description: '一般性的记忆和信息' },
      'character': { name: '角色相关', description: '与角色相关的记忆和信息' },
      'location': { name: '地点相关', description: '与地点相关的记忆和信息' },
      'event': { name: '事件相关', description: '与事件相关的记忆和信息' },
      'item': { name: '物品相关', description: '与物品相关的记忆和信息' }
    };
    
    // 嵌入向量缓存
    this.embeddingCache = new Map();
    
    // 系统配置
    this.config = {
      maxMemories: 100,          // 最大记忆数量
      recencyWeight: 0.3,        // 新近性权重
      relevanceThreshold: 0.5,   // 相关性阈值
      importanceWeight: 0.3,     // 重要性权重
      decayRate: 0.05,           // 每天的记忆衰减率
      embeddingDimension: 384,   // 嵌入向量维度
      maxEmbeddingCacheSize: 500 // 最大嵌入向量缓存数量
    };
    
    // 统计信息
    this.stats = {
      totalMemories: 0,
      retrievalCount: 0,
      lastAccess: null,
      categoryStats: {}
    };
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   * @returns {Object} 更新后的配置
   */
  updateConfig(newConfig) {
    if (!newConfig) return this.config;
    
    try {
      this.config = { ...this.config, ...newConfig };
      
      // 如果配置了记忆数量上限，则清理超出的记忆
      if (newConfig.maxMemories && this.memories.length > newConfig.maxMemories) {
        // 按重要性和新近性排序
        this.memories.sort((a, b) => {
          const scoreA = (a.importance || 0.5) * 0.7 + (a.timestamp ? 0.3 : 0);
          const scoreB = (b.importance || 0.5) * 0.7 + (b.timestamp ? 0.3 : 0);
          return scoreB - scoreA;
        });
        
        // 保留最重要的记忆
        this.memories = this.memories.slice(0, newConfig.maxMemories);
      }
      
      return this.config;
    } catch (error) {
      console.error('更新记忆配置失败:', error);
      return this.config;
    }
  }
  
  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return this.config;
  }

  /**
   * 获取所有记忆
   * @param {Object} options - 选项（分类、排序等）
   * @returns {Array} 记忆列表
   */
  getMemories(options = {}) {
    try {
      let result = [...this.memories];
      
      // 记录访问统计
      this.stats.retrievalCount++;
      this.stats.lastAccess = Date.now();
      
      // 按分类过滤
      if (options.category && this.categories[options.category]) {
        result = result.filter(memory => memory.category === options.category);
      }
      
      // 按标签过滤
      if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
        result = result.filter(memory => {
          if (!memory.tags || !Array.isArray(memory.tags)) return false;
          return options.tags.some(tag => memory.tags.includes(tag));
        });
      }
      
      // 按时间范围过滤
      if (options.startTime) {
        result = result.filter(memory => memory.timestamp >= options.startTime);
      }
      
      if (options.endTime) {
        result = result.filter(memory => memory.timestamp <= options.endTime);
      }
      
      // 按重要性过滤
      if (options.minImportance) {
        result = result.filter(memory => (memory.importance || 0) >= options.minImportance);
      }
      
      // 排序
      if (options.sortBy) {
        switch (options.sortBy) {
          case 'time':
            result.sort((a, b) => (options.sortOrder === 'asc' ? 1 : -1) * ((a.timestamp || 0) - (b.timestamp || 0)));
            break;
          case 'importance':
            result.sort((a, b) => (options.sortOrder === 'asc' ? 1 : -1) * ((a.importance || 0) - (b.importance || 0)));
            break;
          case 'relevance':
            // 默认保持原有顺序，因为相关性需要在查询时计算
            break;
        }
      }
      
      // 限制返回数量
      if (options.limit && options.limit > 0) {
        result = result.slice(0, options.limit);
      }
      
      return result;
    } catch (error) {
      console.error('获取记忆失败:', error);
      return [];
    }
  }

  /**
   * 添加新记忆
   * @param {Object} memory - 记忆对象
   * @returns {Object} 添加的记忆
   */
  addMemory(memory) {
    try {
      if (!memory || !memory.content) {
        throw new Error('记忆内容不能为空');
      }
      
      // 添加必要字段
      const newMemory = {
        ...memory,
        id: memory.id || `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp: memory.timestamp || Date.now(),
        importance: memory.importance || 0.5,
        category: memory.category || 'general',
        tags: memory.tags || [],
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0
      };
      
      // 检查记忆数量限制
      if (this.memories.length >= this.config.maxMemories) {
        // 按重要性和访问时间排序
        this.memories.sort((a, b) => {
          const scoreA = (a.importance || 0.5) * 0.7 + (Date.now() - (a.lastAccessed || 0)) / (1000 * 60 * 60 * 24) * 0.3;
          const scoreB = (b.importance || 0.5) * 0.7 + (Date.now() - (b.lastAccessed || 0)) / (1000 * 60 * 60 * 24) * 0.3;
          return scoreA - scoreB; // 分数低的先移除
        });
        
        // 移除最不重要的记忆
        this.memories.shift();
      }
      
      // 添加新记忆
      this.memories.push(newMemory);
      
      // 更新统计信息
      this.stats.totalMemories++;
      if (!this.stats.categoryStats[newMemory.category]) {
        this.stats.categoryStats[newMemory.category] = 0;
      }
      this.stats.categoryStats[newMemory.category]++;
      
      return newMemory;
    } catch (error) {
      console.error('添加记忆失败:', error, '记忆:', memory);
      throw error;
    }
  }

  /**
   * 清空记忆
   * @param {string} category - 可选，指定分类
   * @returns {Array} 清空后的记忆列表
   */
  clearMemories(category) {
    try {
      if (category && this.categories[category]) {
        // 只清空指定分类的记忆
        this.memories = this.memories.filter(memory => memory.category !== category);
        
        // 重置分类统计
        this.stats.categoryStats[category] = 0;
      } else {
        // 清空所有记忆
        this.memories = [];
        
        // 重置统计
        this.stats.totalMemories = 0;
        this.stats.categoryStats = {};
      }
      
      return this.memories;
    } catch (error) {
      console.error('清空记忆失败:', error);
      return this.memories;
    }
  }
  
  /**
   * 根据ID获取记忆
   * @param {string} id - 记忆ID
   * @returns {Object|null} 记忆对象或null
   */
  getMemoryById(id) {
    try {
      const memory = this.memories.find(mem => mem.id === id);
      
      if (memory) {
        // 更新访问信息
        memory.lastAccessed = Date.now();
        memory.accessCount = (memory.accessCount || 0) + 1;
      }
      
      return memory || null;
    } catch (error) {
      console.error('获取记忆失败:', error, 'ID:', id);
      return null;
    }
  }
  
  /**
   * 更新记忆
   * @param {string} id - 记忆ID
   * @param {Object} updates - 更新内容
   * @returns {Object|null} 更新后的记忆或null
   */
  updateMemory(id, updates) {
    try {
      const index = this.memories.findIndex(mem => mem.id === id);
      
      if (index === -1) {
        return null;
      }
      
      // 更新记忆
      const oldMemory = this.memories[index];
      const updatedMemory = {
        ...oldMemory,
        ...updates,
        id: oldMemory.id, // 保持ID不变
        lastModified: Date.now()
      };
      
      // 如果分类发生变化，更新统计
      if (updates.category && oldMemory.category !== updates.category) {
        if (this.stats.categoryStats[oldMemory.category]) {
          this.stats.categoryStats[oldMemory.category]--;
        }
        
        if (!this.stats.categoryStats[updates.category]) {
          this.stats.categoryStats[updates.category] = 0;
        }
        this.stats.categoryStats[updates.category]++;
      }
      
      this.memories[index] = updatedMemory;
      return updatedMemory;
    } catch (error) {
      console.error('更新记忆失败:', error, 'ID:', id, '更新:', updates);
      return null;
    }
  }
  
  /**
   * 删除记忆
   * @param {string} id - 记忆ID
   * @returns {boolean} 是否成功删除
   */
  deleteMemory(id) {
    try {
      const index = this.memories.findIndex(mem => mem.id === id);
      
      if (index === -1) {
        return false;
      }
      
      // 更新统计
      const memory = this.memories[index];
      if (memory.category && this.stats.categoryStats[memory.category]) {
        this.stats.categoryStats[memory.category]--;
      }
      this.stats.totalMemories--;
      
      // 删除记忆
      this.memories.splice(index, 1);
      
      // 删除嵌入向量缓存
      if (memory.id && this.embeddingCache.has(memory.id)) {
        this.embeddingCache.delete(memory.id);
      }
      
      return true;
    } catch (error) {
      console.error('删除记忆失败:', error, 'ID:', id);
      return false;
    }
  }
  
  /**
   * 生成嵌入向量
   * @param {string} text - 需要生成嵌入向量的文本
   * @returns {Promise<Array>} 嵌入向量
   */
  async generateEmbedding(text) {
    try {
      // 如果文本为空，返回零向量
      if (!text || text.trim() === '') {
        return new Array(this.config.embeddingDimension).fill(0);
      }
      
      // 简化版本：使用基于文本的哈希生成伪嵌入向量
      // 在实际应用中，这里应调用嵌入向量 API
      
      // 计算文本的简单哈希
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash; // 转为32位整数
      }
      
      // 使用哈希生成伪随机数序列
      const pseudoRandom = (seed) => {
        return (Math.sin(seed) * 10000) % 1;
      };
      
      // 生成伪嵌入向量
      const embedding = [];
      for (let i = 0; i < this.config.embeddingDimension; i++) {
        embedding.push(pseudoRandom(hash + i) * 2 - 1); // 生成-1到1之间的值
      }
      
      // 向量归一化
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      const normalizedEmbedding = embedding.map(val => val / magnitude);
      
      return normalizedEmbedding;
    } catch (error) {
      console.error('生成嵌入向量失败:', error, '文本:', text);
      // 出错时返回零向量
      return new Array(this.config.embeddingDimension).fill(0);
    }
  }
  
  /**
   * 计算余弦相似度
   * @param {Array} vec1 - 向量1
   * @param {Array} vec2 - 向量2
   * @returns {number} 相似度分数 (0-1)
   */
  calculateCosineSimilarity(vec1, vec2) {
    try {
      if (!vec1 || !vec2 || vec1.length !== vec2.length) {
        return 0;
      }
      
      let dotProduct = 0;
      let mag1 = 0;
      let mag2 = 0;
      
      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        mag1 += vec1[i] * vec1[i];
        mag2 += vec2[i] * vec2[i];
      }
      
      mag1 = Math.sqrt(mag1);
      mag2 = Math.sqrt(mag2);
      
      if (mag1 === 0 || mag2 === 0) {
        return 0;
      }
      
      return dotProduct / (mag1 * mag2);
    } catch (error) {
      console.error('计算相似度失败:', error);
      return 0;
    }
  }
  
  /**
   * 添加记忆并生成嵌入向量
   * @param {Object} memory - 记忆对象
   * @returns {Promise<Object>} 添加的记忆
   */
  async addMemoryWithEmbedding(memory) {
    try {
      // 首先添加记忆
      const newMemory = this.addMemory(memory);
      
      // 生成嵌入向量
      const embedding = await this.generateEmbedding(newMemory.content);
      
      // 将嵌入向量存入缓存
      this.embeddingCache.set(newMemory.id, embedding);
      
      // 清理缓存，如果超过最大大小
      if (this.embeddingCache.size > this.config.maxEmbeddingCacheSize) {
        // 移除最早添加的缓存
        const oldestKey = this.embeddingCache.keys().next().value;
        this.embeddingCache.delete(oldestKey);
      }
      
      return newMemory;
    } catch (error) {
      console.error('添加记忆并生成嵌入向量失败:', error, '记忆:', memory);
      throw error;
    }
  }
  
  /**
   * 根据文本查询检索相关记忆
   * @param {string} query - 查询文本
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 相关记忆列表
   */
  async searchMemories(query, options = {}) {
    try {
      if (!query || query.trim() === '') {
        return [];
      }
      
      // 生成查询的嵌入向量
      const queryEmbedding = await this.generateEmbedding(query);
      
      // 默认选项
      const mergedOptions = {
        limit: options.limit || 5,
        threshold: options.threshold || this.config.relevanceThreshold,
        category: options.category || null,
        tags: options.tags || null,
        applyDecay: options.applyDecay !== false, // 默认应用衰减
        includeScores: options.includeScores !== false // 默认包含分数
      };
      
      // 获取符合分类和标签过滤条件的记忆
      const filteredMemories = this.getMemories({
        category: mergedOptions.category,
        tags: mergedOptions.tags
      });
      
      // 计算每个记忆的相关性分数
      const scoredMemories = await Promise.all(filteredMemories.map(async memory => {
        // 获取或生成记忆的嵌入向量
        let memoryEmbedding;
        if (this.embeddingCache.has(memory.id)) {
          memoryEmbedding = this.embeddingCache.get(memory.id);
        } else {
          memoryEmbedding = await this.generateEmbedding(memory.content);
          this.embeddingCache.set(memory.id, memoryEmbedding);
        }
        
        // 计算相似度
        const similarity = this.calculateCosineSimilarity(queryEmbedding, memoryEmbedding);
        
        // 计算时间衰减因子
        let decayFactor = 1;
        if (mergedOptions.applyDecay && memory.timestamp) {
          const daysSinceCreation = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
          decayFactor = Math.exp(-this.config.decayRate * daysSinceCreation);
        }
        
        // 计算最终分数 = 相似度 * 衰减因子 * 重要性
        const finalScore = similarity * decayFactor * (memory.importance || 0.5);
        
        return {
          ...memory,
          similarity,
          decayFactor,
          score: finalScore
        };
      }));
      
      // 过滤掉相关性低于阈值的记忆
      const relevantMemories = scoredMemories
        .filter(memory => memory.similarity >= mergedOptions.threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, mergedOptions.limit);
      
      // 更新访问信息
      relevantMemories.forEach(memory => {
        const originalMemory = this.memories.find(mem => mem.id === memory.id);
        if (originalMemory) {
          originalMemory.lastAccessed = Date.now();
          originalMemory.accessCount = (originalMemory.accessCount || 0) + 1;
        }
      });
      
      // 如果不需要包含分数信息，则移除这些字段
      if (!mergedOptions.includeScores) {
        return relevantMemories.map(({ similarity, decayFactor, score, ...memory }) => memory);
      }
      
      return relevantMemories;
    } catch (error) {
      console.error('搜索记忆失败:', error, '查询:', query);
      return [];
    }
  }
  
  /**
   * 生成记忆摘要
   * @param {Array} memories - 记忆列表
   * @param {number} maxLength - 摘要最大长度
   * @returns {string} 记忆摘要
   */
  generateMemorySummary(memories, maxLength = 500) {
    try {
      if (!memories || memories.length === 0) {
        return '没有可用的记忆';
      }
      
      // 按时间排序
      const sortedMemories = [...memories].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      // 生成摘要
      let summary = sortedMemories.map(memory => {
        const date = memory.timestamp ? new Date(memory.timestamp).toLocaleDateString() : '未知日期';
        return `[${date}] ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`;
      }).join('\n\n');
      
      // 如果摘要过长，进行裁剪
      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
      }
      
      return summary;
    } catch (error) {
      console.error('生成记忆摘要失败:', error);
      return '生成记忆摘要时出错';
    }
  }
}

// 导出单例实例
const memoryStore = new MemoryStore();
export default memoryStore;
