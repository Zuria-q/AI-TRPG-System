/**
 * GM代理模块 - 负责故事叙述和NPC调度
 * 包含主持人决策、NPC发言排序、世界状态更新等功能
 */
import agentRegistry from '../agent_registry';
import gameState from './game_state';
import trustMap from './trust_map';
import memoryStore from './memory_store';
import promptBuilder from './prompt_builder';

class GMAgent {
  constructor() {
    this.currentScene = null;
    this.activeNPCs = new Set();
    this.speakingQueue = [];
    this.worldTime = {
      day: 1,
      hour: 8,
      minute: 0
    };
    this.lastUpdateTime = Date.now();
  }

  /**
   * 初始化GM代理
   * @param {Object} config - 配置信息
   */
  initialize(config = {}) {
    this.config = {
      speakingStrategy: 'relevance', // 'round-robin', 'relevance', 'distance'
      maxActiveNPCs: 3,
      timeProgressRate: 1, // 时间流逝速率
      ...config
    };

    // 重置状态
    this.activeNPCs.clear();
    this.speakingQueue = [];
    this.lastUpdateTime = Date.now();
    
    console.log('GM代理初始化完成，配置:', this.config);
    return true;
  }

  /**
   * 生成故事开场白
   * @param {Object} worldSettings - 世界设定
   * @returns {Object} 开场白消息
   */
  async generateOpening(worldSettings) {
    try {
      // 获取世界设定
      const world = worldSettings || gameState.getWorldSettings();
      
      if (!world || !world.background) {
        throw new Error('缺少世界设定信息');
      }
      
      // 构建开场白提示词
      const prompt = `你是一个TRPG游戏的主持人。请根据以下世界设定生成一段开场白，包括背景介绍和当前场景描述。
      使用【】括号标记环境描述和旁白内容。
      
      世界背景:
      ${world.background}
      
      当前场景:
      ${world.currentScene || '一个普通的起始位置'}
      
      主要人物:
      ${this._getCharacterSummary()}
      
      格式要求:
      1. 先用【】括号给出环境描述
      2. 然后描述当前场景和氛围
      3. 总长度控制在300字以内`;
      
      // 获取GM角色
      const gmAgent = this._getGMAgent();
      
      // 如果没有配置好的LLM，返回默认开场白
      if (!gmAgent || !gmAgent.llmConfig) {
        return this._createSystemMessage(
          `【这是一个奇幻世界】\n${world.background}\n\n【当前场景】\n${world.currentScene || '你站在一个未知的起点，等待冒险的开始。'}`
        );
      }
      
      // 调用LLM生成开场白
      const response = await this._callLLM(prompt, gmAgent.llmConfig);
      
      // 保存当前场景
      this.currentScene = response;
      
      // 记录到世界状态
      gameState.updateWorldSettings({
        lastNarration: response,
        lastUpdateTime: Date.now()
      });
      
      return this._createSystemMessage(response);
    } catch (error) {
      console.error('生成开场白失败:', error);
      // 返回默认开场白
      return this._createSystemMessage(
        `【这是一个奇幻世界】\n世界设定加载失败。请检查系统配置。\n\n【当前场景】\n一个模糊的起点，等待被描述。`
      );
    }
  }

  /**
   * 处理玩家输入，安排NPC响应
   * @param {Object} playerMessage - 玩家消息
   * @returns {Array} NPC响应消息数组
   */
  async handlePlayerInput(playerMessage) {
    try {
      if (!playerMessage || !playerMessage.text) {
        throw new Error('无效的玩家输入');
      }
      
      // 解析玩家输入
      const parsedInput = this._parsePlayerInput(playerMessage.text);
      
      // 更新世界状态
      this._updateWorldState(parsedInput);
      
      // 确定哪些NPC应该响应
      const respondingNPCs = await this._determineRespondingNPCs(parsedInput);
      
      // 生成NPC响应
      const responses = [];
      for (const npc of respondingNPCs) {
        const response = await this._generateNPCResponse(npc, parsedInput);
        if (response) {
          responses.push(response);
        }
      }
      
      // 生成环境更新
      const environmentUpdate = await this._generateEnvironmentUpdate(parsedInput, responses);
      if (environmentUpdate) {
        responses.push(environmentUpdate);
      }
      
      // 更新时间
      this._updateGameTime();
      
      return responses;
    } catch (error) {
      console.error('处理玩家输入失败:', error);
      return [this._createSystemMessage('【系统】处理玩家输入时发生错误，请重试。')];
    }
  }

  /**
   * 解析玩家输入，识别不同类型的内容
   * @param {string} text - 玩家输入文本
   * @returns {Object} 解析后的输入
   */
  _parsePlayerInput(text) {
    const result = {
      original: text,
      dialogue: '',
      action: '',
      thought: '',
      hasDialogue: false,
      hasAction: false,
      hasThought: false
    };
    
    // 提取对话内容（引号内）
    const dialogueMatch = text.match(/"([^"]+)"/);
    if (dialogueMatch) {
      result.dialogue = dialogueMatch[1];
      result.hasDialogue = true;
    }
    
    // 提取动作内容（方括号内）
    const actionMatch = text.match(/【([^】]+)】/);
    if (actionMatch) {
      result.action = actionMatch[1];
      result.hasAction = true;
    }
    
    // 提取内心活动（圆括号内）
    const thoughtMatch = text.match(/（([^）]+)）|\(([^)]+)\)/);
    if (thoughtMatch) {
      result.thought = thoughtMatch[1] || thoughtMatch[2];
      result.hasThought = true;
    }
    
    // 如果没有特殊标记，则整体视为对话
    if (!result.hasDialogue && !result.hasAction && !result.hasThought) {
      result.dialogue = text;
      result.hasDialogue = true;
    }
    
    return result;
  }

  /**
   * 更新世界状态
   * @param {Object} parsedInput - 解析后的玩家输入
   */
  _updateWorldState(parsedInput) {
    // 记录玩家行动到历史
    const historyEntry = {
      timestamp: Date.now(),
      actor: 'player',
      content: parsedInput.original,
      type: parsedInput.hasAction ? 'action' : 'dialogue'
    };
    
    // 更新到游戏状态
    const currentState = gameState.getState();
    const history = currentState.history || [];
    history.push(historyEntry);
    
    gameState.updateState({
      history,
      lastPlayerAction: parsedInput,
      lastUpdateTime: Date.now()
    });
  }

  /**
   * 确定哪些NPC应该响应玩家输入
   * @param {Object} parsedInput - 解析后的玩家输入
   * @returns {Array} 应该响应的NPC列表
   */
  async _determineRespondingNPCs(parsedInput) {
    // 获取所有NPC
    const allAgents = agentRegistry.getAllAgents();
    const npcs = Object.values(allAgents).filter(agent => 
      agent.type === 'npc' || agent.type === 'gm'
    );
    
    if (npcs.length === 0) {
      return [];
    }
    
    // 根据不同策略选择响应的NPC
    switch (this.config.speakingStrategy) {
      case 'round-robin':
        // 轮流发言策略
        return this._roundRobinSelection(npcs);
        
      case 'distance':
        // 基于距离的策略（如果有地图信息）
        return this._distanceBasedSelection(npcs);
        
      case 'relevance':
      default:
        // 基于相关性的策略
        return this._relevanceBasedSelection(npcs, parsedInput);
    }
  }

  /**
   * 轮流选择NPC发言
   * @param {Array} npcs - 所有NPC列表
   * @returns {Array} 选中的NPC
   */
  _roundRobinSelection(npcs) {
    // 如果队列为空，重新填充
    if (this.speakingQueue.length === 0) {
      // 随机打乱NPC顺序
      const shuffled = [...npcs].sort(() => 0.5 - Math.random());
      this.speakingQueue = shuffled.slice(0, this.config.maxActiveNPCs);
    }
    
    // 取出队首NPC
    const selectedNPC = this.speakingQueue.shift();
    
    // 将这个NPC放到队尾
    this.speakingQueue.push(selectedNPC);
    
    return [selectedNPC];
  }

  /**
   * 基于距离选择NPC发言
   * @param {Array} npcs - 所有NPC列表
   * @returns {Array} 选中的NPC
   */
  _distanceBasedSelection(npcs) {
    // 如果有地图信息，可以基于距离选择
    // 这里简化处理，随机选择1-2个NPC
    const count = Math.min(npcs.length, Math.floor(Math.random() * 2) + 1);
    return npcs.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  /**
   * 基于相关性选择NPC发言
   * @param {Array} npcs - 所有NPC列表
   * @param {Object} parsedInput - 解析后的玩家输入
   * @returns {Array} 选中的NPC
   */
  _relevanceBasedSelection(npcs, parsedInput) {
    // 计算每个NPC的相关性分数
    const scoredNPCs = npcs.map(npc => {
      let score = 0;
      
      // 1. 信任度分数
      const trustScore = trustMap.getTrust('player', npc.id) || 50;
      score += trustScore / 20; // 0-5分
      
      // 2. 随机因素
      score += Math.random() * 3; // 0-3分的随机性
      
      // 3. 如果NPC名字在玩家输入中提到，增加分数
      if (parsedInput.original.includes(npc.name)) {
        score += 10;
      }
      
      return { npc, score };
    });
    
    // 按分数排序
    scoredNPCs.sort((a, b) => b.score - a.score);
    
    // 选择前N个
    const selectedCount = Math.min(
      this.config.maxActiveNPCs, 
      Math.max(1, Math.ceil(npcs.length / 3))
    );
    
    return scoredNPCs.slice(0, selectedCount).map(item => item.npc);
  }

  /**
   * 生成NPC响应
   * @param {Object} npc - NPC对象
   * @param {Object} parsedInput - 解析后的玩家输入
   * @returns {Object} NPC响应消息
   */
  async _generateNPCResponse(npc, parsedInput) {
    try {
      // 构建提示词
      const prompt = this._buildNPCPrompt(npc, parsedInput);
      
      // 调用LLM生成响应
      const response = await this._callLLM(prompt, npc.llmConfig);
      
      // 创建消息对象
      return {
        id: `msg_${Date.now()}_${npc.id}`,
        text: response,
        sender: npc.id,
        senderName: npc.name,
        type: 'NPC_RESPONSE',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`生成NPC(${npc.name})响应失败:`, error);
      return null;
    }
  }

  /**
   * 构建NPC响应的提示词
   * @param {Object} npc - NPC对象
   * @param {Object} parsedInput - 解析后的玩家输入
   * @returns {string} 提示词
   */
  _buildNPCPrompt(npc, parsedInput) {
    // 获取历史对话
    const history = this._getRecentHistory(10);
    
    // 获取当前场景
    const world = gameState.getWorldSettings();
    
    // 获取相关的世界书条目
    const worldbookEntries = this._getRelevantWorldbookEntries(npc, parsedInput);
    const worldbookContext = this._formatWorldbookEntries(worldbookEntries);
    
    // 构建提示词
    return `角色信息:
姓名: ${npc.name}
性别: ${npc.gender || '未知'}
年龄: ${npc.age || '未知'}
身份/职业: ${npc.role || '未知'}
背景: ${npc.background || '无特定背景'}

性格特点:
开放性: ${npc.personality?.openness || 50}/100
尽责性: ${npc.personality?.conscientiousness || 50}/100
外向性: ${npc.personality?.extraversion || 50}/100
亲和性: ${npc.personality?.agreeableness || 50}/100
神经质: ${npc.personality?.neuroticism || 50}/100

世界背景知识:
${worldbookContext}

当前场景:
${this.currentScene || world.currentScene || '一个普通场景'}

最近的对话历史:
${history.map(h => `${h.senderName}: ${h.text}`).join('\n')}

玩家刚刚的输入:
${parsedInput.original}

请根据你的角色性格、背景和世界知识，生成一个自然的回应。你可以:
1. 说话 - 使用引号: "你好，我是${npc.name}"
2. 行动 - 使用方括号: 【${npc.name}向前走了几步】
3. 思考 - 使用圆括号: （我应该怎么回应呢）

注意:
- 保持角色的一致性
- 回应应该与当前场景和玩家输入相关
- 可以混合使用对话、行动和思考
- 回应长度控制在100字以内`;
  }

  /**
   * 生成环境更新描述
   * @param {Object} parsedInput - 解析后的玩家输入
   * @param {Array} npcResponses - NPC响应列表
   * @returns {Object} 环境更新消息
   */
  async _generateEnvironmentUpdate(parsedInput, npcResponses) {
    // 如果没有动作或者NPC响应为空，不生成环境更新
    if (!parsedInput.hasAction && npcResponses.length === 0) {
      return null;
    }
    
    try {
      // 获取GM角色
      const gmAgent = this._getGMAgent();
      
      // 构建提示词
      const prompt = `你是一个TRPG游戏的主持人。请根据以下信息，生成一段环境更新描述。
      使用【】括号标记环境描述和旁白内容。
      
      当前场景:
      ${this.currentScene || '一个普通场景'}
      
      玩家行动:
      ${parsedInput.original}
      
      NPC响应:
      ${npcResponses.map(r => `${r.senderName}: ${r.text}`).join('\n')}
      
      请生成一段简短的环境更新描述，包括:
      1. 场景变化
      2. 时间流逝
      3. 环境反应
      4. 气氛变化
      
      格式要求:
      - 使用【】括号包裹整个描述
      - 长度控制在50-100字之间
      - 不要重复玩家和NPC已经描述的内容
      - 专注于环境和场景的变化`;
      
      // 调用LLM生成环境更新
      const response = await this._callLLM(prompt, gmAgent?.llmConfig);
      
      // 更新当前场景
      this.currentScene = response;
      
      // 更新到游戏状态
      gameState.updateWorldSettings({
        currentScene: response,
        lastUpdateTime: Date.now()
      });
      
      // 创建消息对象
      return this._createSystemMessage(response);
    } catch (error) {
      console.error('生成环境更新失败:', error);
      return null;
    }
  }

  /**
   * 更新游戏内时间
   */
  _updateGameTime() {
    const now = Date.now();
    const elapsed = now - this.lastUpdateTime;
    this.lastUpdateTime = now;
    
    // 计算游戏内时间流逝
    const gameMinutes = Math.floor((elapsed / 1000) * this.config.timeProgressRate);
    
    if (gameMinutes <= 0) return;
    
    // 更新分钟
    this.worldTime.minute += gameMinutes;
    
    // 处理进位
    if (this.worldTime.minute >= 60) {
      this.worldTime.hour += Math.floor(this.worldTime.minute / 60);
      this.worldTime.minute %= 60;
      
      if (this.worldTime.hour >= 24) {
        this.worldTime.day += Math.floor(this.worldTime.hour / 24);
        this.worldTime.hour %= 24;
      }
    }
    
    // 更新到游戏状态
    gameState.updateWorldSettings({
      worldTime: { ...this.worldTime }
    });
  }

  /**
   * 获取GM角色
   * @returns {Object} GM角色
   */
  _getGMAgent() {
    const allAgents = agentRegistry.getAllAgents();
    return Object.values(allAgents).find(agent => agent.type === 'gm');
  }

  /**
   * 获取角色摘要信息
   * @returns {string} 角色摘要
   */
  _getCharacterSummary() {
    const allAgents = agentRegistry.getAllAgents();
    const characters = Object.values(allAgents);
    
    if (characters.length === 0) {
      return '暂无角色信息';
    }
    
    return characters.map(char => 
      `${char.name}: ${char.type === 'player' ? '玩家角色' : (char.type === 'gm' ? '主持人' : 'NPC')}, ${char.role || '未知身份'}`
    ).join('\n');
  }

  /**
   * 获取最近的对话历史
   * @param {number} limit - 限制条数
   * @returns {Array} 历史消息数组
   */
  _getRecentHistory(limit = 10) {
    try {
      // 优先使用聊天记录
      if (gameState.getChatHistory && typeof gameState.getChatHistory === 'function') {
        return gameState.getChatHistory(limit);
      }
      
      // 如果没有聊天记录，则使用历史记录
      const history = gameState.state.history || [];
      return history.slice(-limit);
    } catch (error) {
      console.error('获取对话历史失败:', error);
      return [];
    }
  }

  /**
   * 获取与当前情境相关的世界书条目
   * @param {Object} npc - NPC对象
   * @param {Object} parsedInput - 解析后的玩家输入
   * @returns {Array} 相关的世界书条目
   */
  _getRelevantWorldbookEntries(npc, parsedInput) {
    try {
      // 如果没有世界书功能，返回空数组
      if (!gameState.getEnabledWorldbookEntries || typeof gameState.getEnabledWorldbookEntries !== 'function') {
        return [];
      }
      
      // 获取所有启用的世界书条目
      const allEntries = gameState.getEnabledWorldbookEntries();
      if (!allEntries || allEntries.length === 0) {
        return [];
      }
      
      // 关键词提取
      const keywords = this._extractKeywords(npc, parsedInput);
      
      // 根据关键词过滤相关条目
      const relevantEntries = allEntries.filter(entry => {
        // 检查标题和内容是否包含关键词
        return keywords.some(keyword => 
          (entry.title && entry.title.toLowerCase().includes(keyword.toLowerCase())) ||
          (entry.content && entry.content.toLowerCase().includes(keyword.toLowerCase()))
        );
      });
      
      // 按优先级排序
      return relevantEntries.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('获取相关世界书条目失败:', error, {
        npc: npc?.name,
        input: parsedInput?.original
      });
      return [];
    }
  }
  
  /**
   * 从 NPC 和玩家输入中提取关键词
   * @param {Object} npc - NPC对象
   * @param {Object} parsedInput - 解析后的玩家输入
   * @returns {Array} 关键词数组
   */
  _extractKeywords(npc, parsedInput) {
    const keywords = new Set();
    
    // 从 NPC 信息中提取关键词
    if (npc) {
      if (npc.name) keywords.add(npc.name);
      if (npc.role) keywords.add(npc.role);
      if (npc.faction) keywords.add(npc.faction);
      if (npc.location) keywords.add(npc.location);
    }
    
    // 从玩家输入中提取关键词
    if (parsedInput && parsedInput.original) {
      // 简单分词，去除常见虚词
      const stopWords = ['的', '了', '和', '是', '在', '有', '不', '这', '那', '一', '个', '上', '下', '中', '到'];
      const words = parsedInput.original
        .replace(/[\u3002\uff0c\uff1b\uff1a\u201c\u201d\uff08\uff09\u3001\uff1f\u300a\u300b]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1 && !stopWords.includes(word));
      
      words.forEach(word => keywords.add(word));
    }
    
    // 从当前场景中提取关键词
    const world = gameState.getWorldSettings();
    if (world) {
      if (world.currentLocation) keywords.add(world.currentLocation);
      if (world.name) keywords.add(world.name);
    }
    
    return Array.from(keywords);
  }
  
  /**
   * 格式化世界书条目为提示词可用的文本
   * @param {Array} entries - 世界书条目数组
   * @returns {string} 格式化后的文本
   */
  _formatWorldbookEntries(entries) {
    if (!entries || entries.length === 0) {
      return '无相关世界知识';
    }
    
    // 限制条目数量，避免提示词过长
    const limitedEntries = entries.slice(0, 5);
    
    return limitedEntries.map(entry => {
      // 限制每个条目的内容长度
      const content = entry.content && entry.content.length > 200 
        ? entry.content.substring(0, 200) + '...' 
        : entry.content;
      
      return `${entry.title || '未命名条目'}:\n${content || '无内容'}`;
    }).join('\n\n');
  }

  /**
   * 创建系统消息
   * @param {string} text - 消息内容
   * @returns {Object} 消息对象
   */
  _createSystemMessage(text) {
    return {
      id: `msg_${Date.now()}_system`,
      text,
      sender: 'system',
      senderName: '系统',
      type: 'SYSTEM',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 调用LLM生成内容
   * @param {string} prompt - 提示词
   * @param {Object} llmConfig - LLM配置
   * @returns {string} 生成的内容
   */
  async _callLLM(prompt, llmConfig) {
    // 如果没有配置或者是测试模式，返回模拟响应
    if (!llmConfig || process.env.NODE_ENV === 'test') {
      return `【这是一个模拟的响应】\n由于LLM未配置或处于测试模式，返回此模拟内容。`;
    }
    
    try {
      // 这里应该调用实际的LLM API
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 返回模拟响应
      return `【系统尚未完全实现LLM调用】\n这里将来会返回真实的AI生成内容。\n\n当前提示词长度: ${prompt.length}字`;
    } catch (error) {
      console.error('调用LLM失败:', error);
      throw error;
    }
  }
}

// 单例模式导出
const gmAgent = new GMAgent();
export default gmAgent;
