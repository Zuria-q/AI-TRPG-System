import { 
  gameState,
  agentRegistry,
  agentPolicy,
  trustMap,
  promptBuilder,
  llmIntegration,
  memoryStore
} from '@/modules/index';

/**
 * 游戏主控系统
 */
class GameController {
  constructor() {
    this.isRunning = false;
    this.currentTurn = 0;
    this.playerId = null;
    this.cooldowns = new Map(); // 动作冷却
    this.eventListeners = {}; // 事件监听器
    this.performanceStats = {
      lastFrameTime: 0,
      avgFrameTime: 0,
      frameCount: 0
    };
    this.autoSaveInterval = 10; // 每10回合自动存档
    this.lastSaveTurn = 0;
    
    // 预定义事件类型
    this.EVENT_TYPES = {
      ACTION_START: 'action_start',
      ACTION_END: 'action_end',
      TURN_START: 'turn_start',
      TURN_END: 'turn_end',
      SAVE: 'save',
      LOAD: 'load'
    };
  }

  /**
   * 初始化游戏
   * @param {Object} config - 游戏配置
   */
  initialize(config) {
    try {
      // 初始化游戏状态
      gameState.initializeState(config);
      
      // 初始化记忆系统
      if (memoryStore) {
        memoryStore.updateConfig(config.memoryConfig || {});
      }
      
      // 初始化角色
      if (config.agents && Array.isArray(config.agents)) {
        config.agents.forEach(agentConfig => {
          const agent = agentRegistry.createAgent(agentConfig);
          agentRegistry.register(agent);
        });
      }
    
      // 初始化信任矩阵
      const agentIds = Object.keys(agentRegistry.getAllAgents());
      trustMap.initialize(agentIds);
      
      return true;
    } catch (error) {
      console.error('游戏初始化失败:', error, '配置:', config);
      return false;
    }
    
    this.playerId = config.playerId;
    this.currentTurn = 0;
  }

  /**
   * 开始游戏主循环
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this._gameLoop();
  }

  /**
   * 处理玩家动作
   * @param {Object} action - 玩家动作
   */
  handlePlayerAction(action) {
    if (!this.isRunning) return;
    
    // 设置动作来源
    action.actorId = this.playerId;
    
    // 处理动作
    this._processAction(action);
  }

  /**
   * 游戏主循环（添加自动存档）
   * @private
   */
  async _gameLoop() {
    while (this.isRunning) {
      this._emit(this.EVENT_TYPES.TURN_START, { turn: this.currentTurn });
      
      // NPC决策
      await this._processNPCs();
      
      // 自动存档
      if (this.currentTurn - this.lastSaveTurn >= this.autoSaveInterval) {
        await this.saveGame('autosave');
        this.lastSaveTurn = this.currentTurn;
      }
      
      // 更新游戏状态
      this._updateGameState();
      
      this._emit(this.EVENT_TYPES.TURN_END, { turn: this.currentTurn });
      this.currentTurn++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 处理NPC决策
   * @private
   */
  async _processNPCs() {
    const npcs = agentRegistry.getAll()
      .filter(agent => agent.id !== this.playerId);
    
    for (const npc of npcs) {
      const actions = this._getAvailableActions(npc.id);
      const decision = agentPolicy.decideAction(npc.id, actions, {
        turn: this.currentTurn
      });
      
      if (decision?.action) {
        await this._processAction(decision.action);
      }
    }
  }

  /**
   * 处理动作（添加冷却和事件）
   * @private
   */
  async _processAction(action) {
    // 检查冷却
    if (this._isOnCooldown(action.actorId, action.type)) {
      return { error: '动作冷却中' };
    }
    
    this._emit(this.EVENT_TYPES.ACTION_START, { action });
    
    const startTime = performance.now();
    const result = await this._executeAction(action);
    
    // 记录性能
    const duration = performance.now() - startTime;
    this._recordPerformance('action', duration);
    
    // 设置冷却
    this._setCooldown(action.actorId, action.type);
    
    this._emit(this.EVENT_TYPES.ACTION_END, { action, result });
    return result;
  }

  /**
   * 执行动作核心逻辑
   * @private
   */
  async _executeAction(action) {
    // 执行状态转换
    const result = gameState.computeNextState({
      currentState: gameState,
      action
    });
    
    // 计算信任变化
    result.trustDelta = this._calculateTrustDelta(action, result);
    
    // 生成剧情描述
    const narration = await llmIntegration.generateResponse('action', {
      action,
      result
    });
    
    // 更新信任关系
    if (action.targetId) {
      trustMap.updateTrust(
        action.actorId, 
        action.targetId, 
        result.trustDelta
      );
    }
    
    return { result, narration };
  }

  /**
   * 获取可用动作（添加技能检查）
   * @private
   */
  _getAvailableActions(agentId) {
    const agent = agentRegistry.get(agentId);
    const actions = [];
    
    agent.status = agent.status || {};
    
    // 基础动作
    if (agent.status.fatigue < 50) {
      // 对话动作（根据技能解锁不同对话类型）
      if (this._checkSkill(agentId, 'basic_dialogue')) {
        actions.push({
          type: '对话', 
          targetId: this.playerId,
          motive: agent.mood > 30 ? 'friendly' : 'neutral',
          skill: 'basic_dialogue'
        });
      }
      
      // 高级对话（需要技能）
      if (this._checkSkill(agentId, 'advanced_dialogue') && agent.mood > 60) {
        actions.push({
          type: '说服',
          targetId: this.playerId,
          motive: 'friendly',
          skill: 'advanced_dialogue'
        });
      }
      
      // 移动动作
      const currentLocation = gameState.getLocation(agentId);
      gameState.getConnectedLocations(currentLocation).forEach(loc => {
        actions.push({
          type: '移动',
          targetId: loc,
          motive: 'neutral'
        });
      });
    }
    
    return actions;
  }

  /**
   * 检查角色是否拥有某技能
   * @private
   */
  _checkSkill(agentId, skillId) {
    const agent = agentRegistry.get(agentId);
    return agent.skills?.includes(skillId);
  }

  /**
   * 存档游戏
   * @param {string} slot - 存档位
   */
  async saveGame(slot) {
    const saveData = {
      gameState: gameState.serialize(),
      agents: agentRegistry.serialize(),
      trustMap: trustMap.serialize(),
      meta: {
        turn: this.currentTurn,
        timestamp: Date.now()
      }
    };
    
    localStorage.setItem(`save_${slot}`, JSON.stringify(saveData));
    this._emit('SAVE', { slot });
  }

  /**
   * 读档游戏
   * @param {string} slot - 存档位
   */
  async loadGame(slot) {
    const saveData = JSON.parse(localStorage.getItem(`save_${slot}`));
    if (!saveData) return false;
    
    gameState.deserialize(saveData.gameState);
    agentRegistry.deserialize(saveData.agents);
    trustMap.deserialize(saveData.trustMap);
    
    this.currentTurn = saveData.meta.turn;
    this._emit('LOAD', { slot });
    return true;
  }

  /**
   * 增强版信任计算
   * @private
   */
  _calculateTrustDelta(action, result) {
    const baseValue = action.type === '对话' ? 
      (action.motive === 'friendly' ? 1 : -1) : 0;
    
    // 考虑角色关系
    const relationship = trustMap.getRelationship(
      action.actorId, 
      action.targetId
    );
    
    // 关系越好，正面动作加成越大
    const multiplier = relationship > 50 ? 1.5 : relationship < 30 ? 0.5 : 1;
    
    return Math.round(baseValue * multiplier);
  }

  /**
   * 设置动作冷却
   * @private
   */
  _setCooldown(agentId, actionType) {
    const cooldownMap = this.cooldowns.get(agentId) || new Map();
    cooldownMap.set(actionType, this.currentTurn + 3); // 3回合冷却
    this.cooldowns.set(agentId, cooldownMap);
  }

  /**
   * 检查冷却状态
   * @private
   */
  _isOnCooldown(agentId, actionType) {
    const cooldownMap = this.cooldowns.get(agentId);
    return cooldownMap?.get(actionType) > this.currentTurn;
  }

  /**
   * 记录性能数据
   * @private
   */
  _recordPerformance(type, duration) {
    // 更新帧时间统计
    this.performanceStats.lastFrameTime = duration;
    this.performanceStats.avgFrameTime = 
      (this.performanceStats.avgFrameTime * this.performanceStats.frameCount + duration) / 
      (this.performanceStats.frameCount + 1);
    this.performanceStats.frameCount++;
    
    // 超过阈值警告
    if (duration > 100) {
      console.warn(`[性能警告] ${type} 处理耗时 ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * 注册事件监听器
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   */
  on(eventType, callback) {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType].push(callback);
  }

  /**
   * 触发事件
   * @private
   * @param {string} eventType - 事件类型
   * @param {Object} data - 事件数据
   */
  _emit(eventType, data) {
    const listeners = this.eventListeners[eventType];
    if (listeners) {
      listeners.forEach(cb => cb(data));
    }
  }

  /**
   * 更新游戏状态
   * @private
   */
  _updateGameState() {
    agentRegistry.getAll().forEach(agent => {
      agent.status = agent.status || {};
      agent.status.fatigue = Math.max(0, (agent.status.fatigue || 0) - 5);
    });
  }
}

// 单例模式导出
const gameController = new GameController();

export default gameController;
