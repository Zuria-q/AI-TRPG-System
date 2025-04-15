/**
 * 游戏状态管理模块
 */
class GameState {
  constructor() {
    this.state = {
      gameId: null,
      turn: 0,
      phase: 'setup', // setup, planning, action, resolution, end
      activeAgentId: null,
      agents: [],
      world: {
        name: '',
        description: '',
        currentLocation: '',
        locations: {},
        objects: {},
        time: 'day',
        weather: 'clear'
      },
      worldbook: [], // 世界书条目
      chatHistory: [], // 聊天记录
      history: [],
      flags: {},
      lastUpdate: Date.now()
    };
    
    // 尝试从本地存储加载游戏状态
    this._loadFromStorage();
  }
  
  /**
   * 从本地存储加载游戏状态
   * @private
   */
  _loadFromStorage() {
    try {
      const savedState = localStorage.getItem('game_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.state = {
          ...this.state,
          ...parsedState,
          lastUpdate: Date.now()
        };
        console.log('从本地存储加载游戏状态成功');
      }
    } catch (error) {
      console.error('从本地存储加载游戏状态失败:', error);
    }
  }
  
  /**
   * 保存游戏状态到本地存储
   * @private
   */
  _saveToStorage() {
    try {
      localStorage.setItem('game_state', JSON.stringify(this.state));
    } catch (error) {
      console.error('保存游戏状态到本地存储失败:', error);
    }
  }

  /**
   * 初始化游戏状态
   * @param {Object} config - 游戏配置
   */
  initializeState(config) {
    try {
      this.state = {
        ...this.state,
        gameId: `game_${Date.now()}`,
        turn: 0,
        phase: 'setup',
        world: {
          ...this.state.world,
          ...config.world
        },
        lastUpdate: Date.now()
      };
      return true;
    } catch (error) {
      console.error('初始化游戏状态失败:', error, '配置:', config);
      return false;
    }
  }

  /**
   * 获取当前游戏状态
   * @returns {Object} 当前游戏状态
   */
  getState() {
    return this.state;
  }

  /**
   * 更新游戏状态
   * @param {Object} newState - 新的状态数据
   */
  updateState(newState) {
    this.state = {
      ...this.state,
      ...newState,
      lastUpdate: Date.now()
    };
    
    // 保存到本地存储
    this._saveToStorage();
    
    return this.state;
  }

  /**
   * 进入下一回合
   */
  nextTurn() {
    this.state.turn += 1;
    return this.state.turn;
  }

  /**
   * 设置游戏阶段
   * @param {string} phase - 游戏阶段
   */
  setPhase(phase) {
    this.state.phase = phase;
    return this.state.phase;
  }

  /**
   * 添加历史记录
   * @param {Object} event - 事件数据
   */
  addHistory(event) {
    this.state.history.push({
      ...event,
      turn: this.state.turn,
      timestamp: Date.now()
    });
  }

  /**
   * 获取历史记录
   * @param {number} limit - 限制返回的记录数
   * @returns {Array} 历史记录
   */
  getHistory(limit = 0) {
    if (limit <= 0) {
      return this.state.history;
    }
    return this.state.history.slice(-limit);
  }

  /**
   * 设置标志
   * @param {string} key - 标志键
   * @param {*} value - 标志值
   */
  setFlag(key, value) {
    this.state.flags[key] = value;
  }

  /**
   * 获取标志
   * @param {string} key - 标志键
   * @returns {*} 标志值
   */
  getFlag(key) {
    return this.state.flags[key];
  }
  
  /**
   * 获取世界设定
   * @returns {Object} 当前世界设定
   */
  getWorldSettings() {
    return this.state.world || {};
  }
  
  /**
   * 更新世界设定
   * @param {Object} worldSettings - 新的世界设定
   * @returns {Object} 更新后的世界设定
   */
  updateWorldSettings(worldSettings) {
    try {
      // 确保不会丢失现有的世界数据
      this.state.world = {
        ...this.state.world,
        ...worldSettings,
        lastUpdate: Date.now()
      };
      
      // 保存到本地存储
      this._saveToStorage();
      
      return this.state.world;
    } catch (error) {
      console.error('更新世界设定失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取世界书条目
   * @param {string} category - 可选的分类筛选
   * @returns {Array} 世界书条目数组
   */
  getWorldbookEntries(category = null) {
    const entries = this.state.worldbook || [];
    if (category) {
      return entries.filter(entry => entry.category === category);
    }
    return entries;
  }
  
  /**
   * 获取启用的世界书条目
   * @returns {Array} 启用的世界书条目数组
   */
  getEnabledWorldbookEntries() {
    const entries = this.state.worldbook || [];
    return entries
      .filter(entry => entry.enabled)
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * 更新世界书条目
   * @param {Array} entries - 新的世界书条目数组
   * @returns {Array} 更新后的世界书条目数组
   */
  updateWorldbookEntries(entries) {
    try {
      this.state.worldbook = entries;
      this._saveToStorage();
      return this.state.worldbook;
    } catch (error) {
      console.error('更新世界书条目失败:', error);
      throw error;
    }
  }
  
  /**
   * 添加聊天记录
   * @param {Object} message - 消息对象
   */
  addChatMessage(message) {
    try {
      if (!this.state.chatHistory) {
        this.state.chatHistory = [];
      }
      
      this.state.chatHistory.push({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      });
      
      // 保存到本地存储
      this._saveToStorage();
      
      return this.state.chatHistory;
    } catch (error) {
      console.error('添加聊天记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取聊天记录
   * @param {number} limit - 限制返回的记录数
   * @returns {Array} 聊天记录数组
   */
  getChatHistory(limit = 0) {
    const history = this.state.chatHistory || [];
    if (limit <= 0) {
      return history;
    }
    return history.slice(-limit);
  }
  
  /**
   * 清除聊天记录
   */
  clearChatHistory() {
    this.state.chatHistory = [];
    this._saveToStorage();
  }
}

// 导出单例实例
const gameState = new GameState();
export default gameState;
