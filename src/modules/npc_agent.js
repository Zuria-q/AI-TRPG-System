/**
 * NPC角色代理模块
 * 处理NPC的对话生成、行动决策和状态管理
 */
import agentRegistry from '../agent_registry';
import gameState from './game_state';
import trustMap from './trust_map';
import memoryStore from './memory_store';

class NPCAgent {
  constructor() {
    this.activeNPCs = new Map(); // NPC ID -> 状态
    this.responseCache = new Map(); // 缓存最近的响应，避免重复
    this.maxCacheSize = 50;
  }

  /**
   * 初始化NPC代理
   * @param {Object} config - 配置信息
   */
  initialize(config = {}) {
    this.config = {
      maxContextLength: 2000, // 最大上下文长度
      responseCacheTime: 5 * 60 * 1000, // 响应缓存时间（5分钟）
      ...config
    };

    // 清空缓存
    this.responseCache.clear();
    this.activeNPCs.clear();
    
    console.log('NPC代理初始化完成，配置:', this.config);
    return true;
  }

  /**
   * 激活一个NPC
   * @param {string} npcId - NPC ID
   * @returns {boolean} 是否成功激活
   */
  activateNPC(npcId) {
    try {
      const npc = agentRegistry.get(npcId);
      if (!npc) {
        console.error(`找不到ID为${npcId}的NPC`);
        return false;
      }
      
      this.activeNPCs.set(npcId, {
        lastActive: Date.now(),
        mood: 'neutral', // 情绪状态
        focus: null, // 当前关注的对象
        contextMemory: [] // 上下文记忆
      });
      
      return true;
    } catch (error) {
      console.error(`激活NPC(${npcId})失败:`, error);
      return false;
    }
  }

  /**
   * 停用一个NPC
   * @param {string} npcId - NPC ID
   */
  deactivateNPC(npcId) {
    this.activeNPCs.delete(npcId);
  }

  /**
   * 生成NPC响应
   * @param {string} npcId - NPC ID
   * @param {Object} context - 上下文信息
   * @returns {Object} NPC响应
   */
  async generateResponse(npcId, context) {
    try {
      // 获取NPC
      const npc = agentRegistry.get(npcId);
      if (!npc) {
        throw new Error(`找不到ID为${npcId}的NPC`);
      }
      
      // 检查缓存
      const cacheKey = `${npcId}_${context.messageId || Date.now()}`;
      if (this.responseCache.has(cacheKey)) {
        const cached = this.responseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.responseCacheTime) {
          return cached.response;
        }
      }
      
      // 准备NPC状态
      if (!this.activeNPCs.has(npcId)) {
        this.activateNPC(npcId);
      }
      
      const npcState = this.activeNPCs.get(npcId);
      npcState.lastActive = Date.now();
      
      // 更新上下文记忆
      this._updateContextMemory(npcId, context);
      
      // 构建提示词
      const prompt = await this._buildPrompt(npc, context);
      
      // 调用LLM生成响应
      const response = await this._callLLM(prompt, npc.llmConfig);
      
      // 解析响应
      const parsedResponse = this._parseResponse(response);
      
      // 更新NPC状态
      this._updateNPCState(npcId, parsedResponse, context);
      
      // 缓存响应
      const responseObj = {
        id: `resp_${Date.now()}_${npcId}`,
        text: response,
        parsedContent: parsedResponse,
        sender: npcId,
        senderName: npc.name,
        type: 'NPC_RESPONSE',
        timestamp: new Date().toISOString()
      };
      
      this.responseCache.set(cacheKey, {
        response: responseObj,
        timestamp: Date.now()
      });
      
      // 清理过期缓存
      this._cleanCache();
      
      return responseObj;
    } catch (error) {
      console.error(`生成NPC(${npcId})响应失败:`, error);
      return {
        id: `error_${Date.now()}_${npcId}`,
        text: `【${npcId}的响应生成失败】`,
        sender: 'system',
        senderName: '系统',
        type: 'ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 批量生成多个NPC的响应
   * @param {Array} npcIds - NPC ID数组
   * @param {Object} context - 上下文信息
   * @returns {Array} NPC响应数组
   */
  async generateMultipleResponses(npcIds, context) {
    const responses = [];
    
    // 按顺序生成每个NPC的响应
    for (const npcId of npcIds) {
      try {
        // 为每个NPC添加之前NPC的响应到上下文
        const updatedContext = {
          ...context,
          previousResponses: responses.slice()
        };
        
        const response = await this.generateResponse(npcId, updatedContext);
        responses.push(response);
      } catch (error) {
        console.error(`生成NPC(${npcId})响应失败:`, error);
      }
    }
    
    return responses;
  }

  /**
   * 更新NPC的上下文记忆
   * @param {string} npcId - NPC ID
   * @param {Object} context - 上下文信息
   */
  _updateContextMemory(npcId, context) {
    if (!this.activeNPCs.has(npcId)) return;
    
    const npcState = this.activeNPCs.get(npcId);
    const memory = npcState.contextMemory || [];
    
    // 添加新的上下文
    if (context.playerMessage) {
      memory.push({
        type: 'player',
        content: context.playerMessage.text,
        timestamp: Date.now()
      });
    }
    
    // 如果有其他NPC的响应，也添加到上下文
    if (context.previousResponses && Array.isArray(context.previousResponses)) {
      for (const resp of context.previousResponses) {
        memory.push({
          type: 'npc',
          npcId: resp.sender,
          npcName: resp.senderName,
          content: resp.text,
          timestamp: Date.now()
        });
      }
    }
    
    // 限制上下文长度
    while (JSON.stringify(memory).length > this.config.maxContextLength && memory.length > 0) {
      memory.shift(); // 移除最旧的记忆
    }
    
    npcState.contextMemory = memory;
    this.activeNPCs.set(npcId, npcState);
  }

  /**
   * 更新NPC状态
   * @param {string} npcId - NPC ID
   * @param {Object} parsedResponse - 解析后的响应
   * @param {Object} context - 上下文信息
   */
  _updateNPCState(npcId, parsedResponse, context) {
    if (!this.activeNPCs.has(npcId)) return;
    
    const npcState = this.activeNPCs.get(npcId);
    
    // 根据响应更新情绪
    if (parsedResponse.thought && parsedResponse.thought.includes('生气') || 
        parsedResponse.thought && parsedResponse.thought.includes('愤怒')) {
      npcState.mood = 'angry';
    } else if (parsedResponse.thought && parsedResponse.thought.includes('高兴') || 
               parsedResponse.thought && parsedResponse.thought.includes('开心')) {
      npcState.mood = 'happy';
    } else if (parsedResponse.thought && parsedResponse.thought.includes('悲伤') || 
               parsedResponse.thought && parsedResponse.thought.includes('难过')) {
      npcState.mood = 'sad';
    } else if (parsedResponse.thought && parsedResponse.thought.includes('害怕') || 
               parsedResponse.thought && parsedResponse.thought.includes('恐惧')) {
      npcState.mood = 'scared';
    }
    
    // 更新关注对象
    if (context.playerMessage) {
      npcState.focus = 'player';
    } else if (context.previousResponses && context.previousResponses.length > 0) {
      npcState.focus = context.previousResponses[context.previousResponses.length - 1].sender;
    }
    
    this.activeNPCs.set(npcId, npcState);
  }

  /**
   * 构建NPC响应的提示词
   * @param {Object} npc - NPC对象
   * @param {Object} context - 上下文信息
   * @returns {string} 提示词
   */
  async _buildPrompt(npc, context) {
    // 获取NPC状态
    const npcState = this.activeNPCs.get(npc.id) || {
      mood: 'neutral',
      focus: null,
      contextMemory: []
    };
    
    // 获取相关记忆
    let memories = '';
    if (memoryStore) {
      try {
        const relevantMemories = await memoryStore.retrieveMemories({
          agentId: npc.id,
          query: context.playerMessage?.text || '',
          limit: 3
        });
        
        if (relevantMemories && relevantMemories.length > 0) {
          memories = '相关记忆:\n' + relevantMemories.map(m => `- ${m.content}`).join('\n');
        }
      } catch (error) {
        console.error('获取记忆失败:', error);
      }
    }
    
    // 构建上下文历史
    const history = npcState.contextMemory.map(item => {
      if (item.type === 'player') {
        return `玩家: ${item.content}`;
      } else {
        return `${item.npcName || 'NPC'}: ${item.content}`;
      }
    }).join('\n');
    
    // 获取当前场景
    const world = gameState.getWorldSettings();
    
    // 构建提示词
    return `你是一个名为${npc.name}的角色，正在参与一个TRPG游戏。请根据以下信息，生成你的回应。

角色信息:
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

当前状态:
情绪: ${npcState.mood}
关注: ${npcState.focus === 'player' ? '玩家' : (npcState.focus ? `${npcState.focus}` : '无特定对象')}

${memories}

当前场景:
${world.currentScene || '一个普通场景'}

对话历史:
${history || '(无历史对话)'}

${context.previousResponses && context.previousResponses.length > 0 ? 
  `其他NPC刚刚的回应:\n${context.previousResponses.map(r => `${r.senderName}: ${r.text}`).join('\n')}` : 
  ''}

玩家刚刚的输入:
${context.playerMessage ? context.playerMessage.text : '(无玩家输入)'}

请根据你的角色性格和背景，生成一个自然的回应。你可以:
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
   * 解析NPC响应
   * @param {string} response - 原始响应文本
   * @returns {Object} 解析后的响应
   */
  _parseResponse(response) {
    const result = {
      original: response,
      dialogue: '',
      action: '',
      thought: '',
      hasDialogue: false,
      hasAction: false,
      hasThought: false
    };
    
    // 提取对话内容（引号内）
    const dialogueMatches = response.match(/"([^"]+)"/g);
    if (dialogueMatches) {
      result.dialogue = dialogueMatches.map(m => m.slice(1, -1)).join(' ');
      result.hasDialogue = true;
    }
    
    // 提取动作内容（方括号内）
    const actionMatches = response.match(/【([^】]+)】/g);
    if (actionMatches) {
      result.action = actionMatches.map(m => m.slice(1, -1)).join(' ');
      result.hasAction = true;
    }
    
    // 提取内心活动（圆括号内）
    const thoughtMatches = response.match(/（([^）]+)）|\(([^)]+)\)/g);
    if (thoughtMatches) {
      result.thought = thoughtMatches.map(m => {
        if (m.startsWith('（')) {
          return m.slice(1, -1);
        } else {
          return m.slice(1, -1);
        }
      }).join(' ');
      result.hasThought = true;
    }
    
    return result;
  }

  /**
   * 清理过期缓存
   */
  _cleanCache() {
    // 如果缓存大小超过限制，清理最旧的
    if (this.responseCache.size > this.maxCacheSize) {
      const entries = [...this.responseCache.entries()];
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // 删除最旧的一半
      const toDelete = Math.floor(entries.length / 2);
      for (let i = 0; i < toDelete; i++) {
        this.responseCache.delete(entries[i][0]);
      }
    }
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
      return `"这是一个模拟的NPC回复"【NPC做了一个简单的动作】（我希望能尽快实现真正的AI生成）`;
    }
    
    try {
      // 这里应该调用实际的LLM API
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 返回模拟响应
      return `"这是一个模拟的NPC回复，稍后会被真实AI替代"【NPC做了一个简单的动作】（我对玩家的输入感到好奇）`;
    } catch (error) {
      console.error('调用LLM失败:', error);
      throw error;
    }
  }
}

// 单例模式导出
const npcAgent = new NPCAgent();
export default npcAgent;
