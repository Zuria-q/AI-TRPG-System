/**
 * 增强型记忆注入模块
 * 负责将相关记忆智能注入到提示词中
 */
class MemoryInjector {
  constructor() {
    // 基本配置
    this.config = {
      maxMemories: 5,             // 最大注入记忆数量
      relevanceThreshold: 0.5,    // 相关性阈值
      recencyWeight: 0.3,         // 新近性权重
      importanceWeight: 0.3,      // 重要性权重
      contextualWeight: 0.4,      // 上下文相关性权重
      useEmbeddingSearch: true,   // 是否使用嵌入向量搜索
      groupSimilarMemories: true, // 是否分组相似记忆
      similarityThreshold: 0.85,  // 分组相似度阈值
      formatMode: 'detailed'       // 格式化模式: 'simple', 'detailed', 'narrative'
    };
    
    // 注入模板
    this.templates = {
      simple: "\n\n相关记忆:\n{{memories}}",
      detailed: "\n\n相关记忆:\n{{memories}}\n\n这些记忆可能与当前情况相关。请根据需要参考这些记忆。",
      narrative: "\n\n你想起了以下事情:\n{{memories}}"
    };
    
    // 缓存
    this.cache = {
      lastQuery: null,
      lastContext: null,
      lastResult: null,
      cacheExpiry: 60000  // 缓存过期时间（毫秒）
    };
    
    // 状态标志
    this.enabled = true;
    this.lastInjectionTime = null;
    this.injectionCount = 0;
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   * @returns {Object} 更新后的配置
   */
  updateConfig(newConfig) {
    try {
      if (!newConfig) return this.config;
      
      // 更新配置
      this.config = { ...this.config, ...newConfig };
      
      // 清除缓存
      this.clearCache();
      
      return this.config;
    } catch (error) {
      console.error('更新记忆注入器配置失败:', error);
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
   * 设置启用状态
   * @param {boolean} enabled - 是否启用
   * @returns {boolean} 更新后的状态
   */
  setEnabled(enabled) {
    this.enabled = !!enabled;
    return this.enabled;
  }
  
  /**
   * 设置注入格式模式
   * @param {string} mode - 格式模式 ('simple', 'detailed', 'narrative')
   * @returns {string} 设置的模式
   */
  setFormatMode(mode) {
    if (this.templates[mode]) {
      this.config.formatMode = mode;
      return mode;
    }
    return this.config.formatMode;
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.cache = {
      lastQuery: null,
      lastContext: null,
      lastResult: null,
      cacheTime: null
    };
  }

  /**
   * 计算记忆与当前上下文的相关性
   * @param {Object} memory - 记忆对象
   * @param {Object} context - 当前上下文
   * @returns {number} 相关性分数 (0-1)
   */
  calculateRelevance(memory, context) {
    if (!memory || !context) {
      return 0;
    }

    try {
      // 提取记忆内容
      const memoryContent = memory.content.toLowerCase();
      
      // 构建上下文文本
      const contextText = [
        context.query || '',
        context.scene || '',
        context.location || '',
        context.action || '',
        Array.isArray(context.characters) ? context.characters.join(' ') : (context.characters || ''),
        Array.isArray(context.items) ? context.items.join(' ') : (context.items || ''),
        context.theme || '',
        context.goal || ''
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (contextText.trim() === '') {
        return 0;
      }

      // 1. 关键词匹配分数
      let keywordScore = 0;
      const contextWords = contextText.split(/[\s,.!?;:\-"\'\(\)]+/).filter(word => word.length > 2);
      
      if (contextWords.length > 0) {
        let matchCount = 0;
        const uniqueWords = [...new Set(contextWords)];
        
        uniqueWords.forEach(word => {
          if (memoryContent.includes(word)) {
            matchCount++;
            
            // 给予特殊关键词更高的权重
            if (context.keywords && context.keywords.includes(word)) {
              matchCount += 0.5;
            }
          }
        });
        
        keywordScore = matchCount / uniqueWords.length;
      }
      
      // 2. 短语匹配分数
      let phraseScore = 0;
      const contextPhrases = this.extractPhrases(contextText);
      
      if (contextPhrases.length > 0) {
        let matchCount = 0;
        contextPhrases.forEach(phrase => {
          if (memoryContent.includes(phrase)) {
            matchCount++;
          }
        });
        
        phraseScore = matchCount / contextPhrases.length;
      }
      
      // 3. 实体匹配分数
      let entityScore = 0;
      const entities = [
        ...(context.characters || []),
        ...(context.items || []),
        context.location,
        ...(context.entities || [])
      ].filter(Boolean);
      
      if (entities.length > 0) {
        let matchCount = 0;
        entities.forEach(entity => {
          if (typeof entity === 'string' && entity.trim() !== '' && 
              memoryContent.includes(entity.toLowerCase())) {
            matchCount++;
          }
        });
        
        entityScore = matchCount / entities.length;
      }
      
      // 4. 时间相关性
      let timeScore = 0;
      if (memory.timestamp && context.currentTime) {
        const hoursDiff = Math.abs(memory.timestamp - context.currentTime) / (1000 * 60 * 60);
        // 时间越接近分数越高，最多考虑前后24小时
        timeScore = Math.max(0, 1 - (hoursDiff / 24));
      }
      
      // 5. 分类相关性
      let categoryScore = 0;
      if (memory.category && context.categories && 
          Array.isArray(context.categories) && 
          context.categories.includes(memory.category)) {
        categoryScore = 0.5;
      }
      
      // 组合所有分数，并进行加权平均
      const relevance = (
        keywordScore * 0.3 +
        phraseScore * 0.3 +
        entityScore * 0.25 +
        timeScore * 0.1 +
        categoryScore * 0.05
      );

      return Math.min(1, relevance);
    } catch (error) {
      console.error('计算记忆相关性失败:', error, '记忆:', memory, '上下文:', context);
      return 0;
    }
  }
  
  /**
   * 从文本中提取短语
   * @param {string} text - 输入文本
   * @returns {Array} 短语列表
   */
  extractPhrases(text) {
    try {
      if (!text || typeof text !== 'string') {
        return [];
      }
      
      // 将文本分割为句子
      const sentences = text.split(/[.!?;]+/).filter(s => s.trim().length > 0);
      
      // 从每个句子中提取短语
      const phrases = [];
      sentences.forEach(sentence => {
        // 分割句子为词组
        const words = sentence.trim().split(/\s+/);
        
        // 生成 2-3 个词的短语
        for (let i = 0; i < words.length - 1; i++) {
          // 两个词的短语
          if (words[i].length > 2 && words[i+1].length > 2) {
            phrases.push(`${words[i]} ${words[i+1]}`.toLowerCase());
          }
          
          // 三个词的短语
          if (i < words.length - 2 && words[i].length > 2 && 
              words[i+1].length > 2 && words[i+2].length > 2) {
            phrases.push(`${words[i]} ${words[i+1]} ${words[i+2]}`.toLowerCase());
          }
        }
      });
      
      // 去除重复短语
      return [...new Set(phrases)];
    } catch (error) {
      console.error('提取短语失败:', error, '文本:', text);
      return [];
    }
  }

  /**
   * 根据时间计算记忆的新近性
   * @param {Object} memory - 记忆对象
   * @param {number} currentTime - 当前时间戳
   * @returns {number} 新近性分数 (0-1)
   */
  calculateRecency(memory, currentTime) {
    try {
      if (!memory || !memory.timestamp) {
        return 0;
      }
      
      // 计算记忆年龄（小时）
      const ageInHours = (currentTime - memory.timestamp) / (1000 * 60 * 60);
      
      // 使用指数衰减函数，这样近期记忆分数会更高
      // 半衰期为24小时（一天）
      const halfLifeInHours = 24;
      const decayRate = Math.log(2) / halfLifeInHours;
      const recencyScore = Math.exp(-decayRate * ageInHours);
      
      return Math.max(0, Math.min(1, recencyScore));
    } catch (error) {
      console.error('计算记忆新近性失败:', error, '记忆:', memory);
      return 0;
    }
  }
  
  /**
   * 计算记忆的重要性分数
   * @param {Object} memory - 记忆对象
   * @returns {number} 重要性分数 (0-1)
   */
  calculateImportance(memory) {
    try {
      if (!memory) {
        return 0.5; // 默认中等重要性
      }
      
      // 使用显式重要性（如果有）
      if (typeof memory.importance === 'number') {
        return Math.max(0, Math.min(1, memory.importance));
      }
      
      // 计算隐式重要性分数
      let score = 0.5; // 默认中等重要性
      
      // 1. 访问频率因素
      if (memory.accessCount) {
        // 访问越频繁，越重要，但有上限
        const accessFactor = Math.min(1, memory.accessCount / 10) * 0.2;
        score += accessFactor;
      }
      
      // 2. 内容长度因素
      if (memory.content) {
        // 较长的记忆可能包含更多信息，但有上限
        const lengthFactor = Math.min(1, memory.content.length / 200) * 0.1;
        score += lengthFactor;
      }
      
      // 3. 特殊标记因素
      if (memory.tags && Array.isArray(memory.tags)) {
        const importantTags = ['important', 'critical', 'key', 'milestone', 'revelation'];
        const hasImportantTag = memory.tags.some(tag => importantTags.includes(tag.toLowerCase()));
        
        if (hasImportantTag) {
          score += 0.2;
        }
      }
      
      // 4. 分类因素
      if (memory.category) {
        // 某些分类可能更重要
        const categoryWeights = {
          'event': 0.15,
          'character': 0.1,
          'location': 0.05,
          'item': 0.05
        };
        
        score += categoryWeights[memory.category] || 0;
      }
      
      return Math.max(0, Math.min(1, score));
    } catch (error) {
      console.error('计算记忆重要性失败:', error, '记忆:', memory);
      return 0.5; // 默认中等重要性
    }
  }

  /**
   * 选择最相关的记忆
   * @param {Array} memories - 记忆列表
   * @param {Object} context - 当前上下文
   * @returns {Array} 筛选后的记忆列表
   */
  selectMemories(memories, context) {
    if (!this.enabled || !memories || memories.length === 0) {
      return [];
    }

    try {
      // 检查缓存
      if (this.cache.lastQuery && 
          this.cache.lastContext && 
          this.cache.lastResult && 
          this.cache.cacheTime && 
          Date.now() - this.cache.cacheTime < this.cache.cacheExpiry) {
        
        // 检查查询和上下文是否相同
        const queryMatch = context.query === this.cache.lastQuery;
        const contextMatch = JSON.stringify(context) === JSON.stringify(this.cache.lastContext);
        
        if (queryMatch && contextMatch) {
          return this.cache.lastResult;
        }
      }
      
      const currentTime = Date.now();
      
      // 计算每个记忆的综合分数
      const scoredMemories = memories.map(memory => {
        const relevance = this.calculateRelevance(memory, context);
        const recency = this.calculateRecency(memory, currentTime);
        const importance = this.calculateImportance(memory);
        
        // 综合分数计算
        const score = (
          relevance * this.config.contextualWeight +
          recency * this.config.recencyWeight +
          importance * this.config.importanceWeight
        );
        
        return { 
          ...memory, 
          score, 
          relevance,
          recency,
          importance
        };
      });
      
      // 过滤掉相关性低于阈值的记忆
      const filteredMemories = scoredMemories.filter(
        memory => memory.relevance >= this.config.relevanceThreshold
      );
      
      // 如果启用了记忆分组，则将相似的记忆合并
      let selectedMemories;
      
      if (this.config.groupSimilarMemories && filteredMemories.length > 1) {
        selectedMemories = this.groupSimilarMemories(
          filteredMemories, 
          this.config.similarityThreshold
        );
      } else {
        // 按分数排序
        selectedMemories = filteredMemories.sort((a, b) => b.score - a.score);
      }
      
      // 限制数量
      const result = selectedMemories.slice(0, this.config.maxMemories);
      
      // 更新缓存
      this.cache.lastQuery = context.query;
      this.cache.lastContext = context;
      this.cache.lastResult = result;
      this.cache.cacheTime = Date.now();
      
      return result;
    } catch (error) {
      console.error('选择记忆失败:', error, '记忆列表:', memories, '上下文:', context);
      return [];
    }
  }
  
  /**
   * 将相似的记忆分组
   * @param {Array} memories - 记忆列表
   * @param {number} threshold - 相似度阈值
   * @returns {Array} 分组后的记忆列表
   */
  groupSimilarMemories(memories, threshold = 0.85) {
    try {
      if (!memories || memories.length <= 1) {
        return memories;
      }
      
      // 按分数排序
      const sortedMemories = [...memories].sort((a, b) => b.score - a.score);
      const groups = [];
      const processed = new Set();
      
      // 为每个记忆找到其组
      for (let i = 0; i < sortedMemories.length; i++) {
        if (processed.has(i)) continue;
        
        const memory = sortedMemories[i];
        const group = [memory];
        processed.add(i);
        
        // 找到与当前记忆相似的其他记忆
        for (let j = i + 1; j < sortedMemories.length; j++) {
          if (processed.has(j)) continue;
          
          const otherMemory = sortedMemories[j];
          const similarity = this.calculateTextSimilarity(
            memory.content, 
            otherMemory.content
          );
          
          if (similarity >= threshold) {
            group.push(otherMemory);
            processed.add(j);
            
            // 限制每组最多3个记忆
            if (group.length >= 3) break;
          }
        }
        
        // 将组添加到结果中
        if (group.length > 1) {
          // 如果有多个记忆，选择分数最高的一个作为代表
          const representative = group[0];
          representative.groupSize = group.length;
          representative.similarMemories = group.slice(1).map(mem => mem.id);
          groups.push(representative);
        } else {
          groups.push(group[0]);
        }
      }
      
      return groups;
    } catch (error) {
      console.error('分组相似记忆失败:', error);
      return memories;
    }
  }
  
  /**
   * 计算两段文本的相似度
   * @param {string} text1 - 文本1
   * @param {string} text2 - 文本2
   * @returns {number} 相似度分数 (0-1)
   */
  calculateTextSimilarity(text1, text2) {
    try {
      if (!text1 || !text2) return 0;
      
      // 将文本转换为小写并分割为词组
      const words1 = text1.toLowerCase().split(/[\s,.!?;:\-"\'\(\)]+/).filter(w => w.length > 2);
      const words2 = text2.toLowerCase().split(/[\s,.!?;:\-"\'\(\)]+/).filter(w => w.length > 2);
      
      // 计算Jaccard相似度
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      
      if (union.size === 0) return 0;
      
      return intersection.size / union.size;
    } catch (error) {
      console.error('计算文本相似度失败:', error);
      return 0;
    }
  }

  /**
   * 将记忆注入到提示词中
   * @param {string} prompt - 原始提示词
   * @param {Array} memories - 选定的记忆列表
   * @returns {string} 注入记忆后的提示词
   */
  injectMemories(prompt, memories) {
    if (!this.enabled || !memories || memories.length === 0) {
      return prompt;
    }

    try {
      // 记录注入统计
      this.lastInjectionTime = Date.now();
      this.injectionCount++;
      
      // 按分类分组记忆
      const categorizedMemories = {};
      memories.forEach(memory => {
        const category = memory.category || 'general';
        if (!categorizedMemories[category]) {
          categorizedMemories[category] = [];
        }
        categorizedMemories[category].push(memory);
      });
      
      // 格式化每个记忆
      const formattedMemories = memories.map((memory, index) => {
        // 基本格式
        let formatted = `[记忆 ${index + 1}] `;
        
        // 添加时间戳（如果有）
        if (memory.timestamp) {
          const date = new Date(memory.timestamp);
          formatted += `[${date.toLocaleDateString()}] `;
        }
        
        // 添加分类（如果有）
        if (memory.category && memory.category !== 'general') {
          formatted += `[${memory.category}] `;
        }
        
        // 添加内容
        formatted += memory.content;
        
        // 如果是分组的记忆，添加提示
        if (memory.groupSize && memory.groupSize > 1) {
          formatted += ` (还有${memory.groupSize - 1}个相关记忆)`;
        }
        
        return formatted;
      }).join('\n');
      
      // 选择模板
      const template = this.templates[this.config.formatMode] || this.templates.simple;
      
      // 替换模板中的占位符
      const memorySection = template.replace('{{memories}}', formattedMemories);
      
      // 判断最佳插入位置
      let injectedPrompt;
      
      // 如果提示词中有特定标记，则在标记处插入
      if (prompt.includes('{{memories}}')) {
        injectedPrompt = prompt.replace('{{memories}}', formattedMemories);
      } else if (prompt.includes('{{MEMORIES}}')) {
        injectedPrompt = prompt.replace('{{MEMORIES}}', formattedMemories);
      } else {
        // 否则在提示词结尾添加
        injectedPrompt = prompt + memorySection;
      }
      
      return injectedPrompt;
    } catch (error) {
      console.error('注入记忆失败:', error, '提示词:', prompt, '记忆:', memories);
      return prompt;
    }
  }

  /**
   * 处理提示词并注入记忆
   * @param {string} prompt - 原始提示词
   * @param {Array} memories - 记忆列表
   * @param {Object} context - 当前上下文
   * @returns {string} 处理后的提示词
   */
  process(prompt, memories, context) {
    if (!this.enabled) {
      return prompt;
    }

    try {
      // 如果没有记忆或上下文，直接返回原始提示词
      if (!memories || memories.length === 0 || !context) {
        return prompt;
      }
      
      // 确保上下文有查询字段
      if (!context.query && prompt) {
        context.query = prompt.substring(0, 200); // 使用提示词的前200个字符作为查询
      }
      
      // 添加当前时间
      context.currentTime = Date.now();
      
      // 如果启用了嵌入向量搜索，使用存储器的搜索功能
      let selectedMemories;
      
      if (this.config.useEmbeddingSearch && 
          context.memoryStore && 
          typeof context.memoryStore.searchMemories === 'function') {
        try {
          // 使用嵌入向量搜索
          selectedMemories = context.memoryStore.searchMemories(
            context.query, 
            {
              limit: this.config.maxMemories,
              threshold: this.config.relevanceThreshold,
              category: context.category,
              tags: context.tags,
              includeScores: true
            }
          );
          
          // 如果返回的是 Promise，则使用传统方法
          if (selectedMemories instanceof Promise) {
            selectedMemories = this.selectMemories(memories, context);
          }
        } catch (e) {
          console.warn('嵌入向量搜索失败，使用传统方法:', e);
          selectedMemories = this.selectMemories(memories, context);
        }
      } else {
        // 使用传统方法选择记忆
        selectedMemories = this.selectMemories(memories, context);
      }
      
      // 注入记忆
      const result = this.injectMemories(prompt, selectedMemories);
      
      // 返回处理后的提示词
      return result;
    } catch (error) {
      console.error('处理提示词失败:', error, '提示词:', prompt, '记忆:', memories, '上下文:', context);
      return prompt;
    }
  }
  
  /**
   * 获取注入器统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      enabled: this.enabled,
      injectionCount: this.injectionCount,
      lastInjectionTime: this.lastInjectionTime,
      cacheHits: this.cache.hits || 0,
      cacheMisses: this.cache.misses || 0,
      formatMode: this.config.formatMode,
      maxMemories: this.config.maxMemories,
      useEmbeddingSearch: this.config.useEmbeddingSearch
    };
  }
}

// 导出单例实例
const memoryInjector = new MemoryInjector();
export default memoryInjector;
