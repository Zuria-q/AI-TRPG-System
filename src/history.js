import { validateState } from './game_state';
import { ActionTypes } from './action_space';

/**
 * 行为结果
 * @typedef {Object} ActionResult
 * @property {string} [response] - NPC 的响应内容
 * @property {number} [reward] - 奖励（如：加血、增加信任）
 * @property {string} [event] - 环境事件（如：门被锁、物资减少等）
 * @property {Array<string>} [memoryUpdates] - 触发的记忆更新
 * @property {boolean} [success] - 行为是否成功
 */

/**
 * 游戏历史记录管理器
 */
class GameHistory {
  constructor() {
    this.records = [];
    this.currentIndex = -1;
  }

  /**
   * 记录新的游戏状态和行为
   * @param {Object} params
   * @param {Object} params.state - 游戏状态
   * @param {Object} params.action - 玩家行为
   * @param {ActionResult} [params.result] - 行为结果
   */
  record({ state, action, result = {} }) {
    if (!validateState(state)) {
      throw new Error('Cannot record invalid state');
    }
    
    this.records.push({
      turn: state.turn,
      timestamp: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)),
      action: JSON.parse(JSON.stringify(action)),
      result: JSON.parse(JSON.stringify(result))
    });
    this.currentIndex = this.records.length - 1;
  }

  /**
   * 获取当前回合的历史记录
   * @returns {Object|null}
   */
  getCurrent() {
    if (this.currentIndex >= 0) {
      return this.records[this.currentIndex];
    }
    return null;
  }

  /**
   * 获取指定回合的历史记录
   * @param {number} turn - 回合数
   * @returns {Object|null}
   */
  getByTurn(turn) {
    return this.records.find(r => r.turn === turn) || null;
  }

  /**
   * 获取最近N条历史记录
   * @param {number} count - 要获取的记录数
   * @returns {Array}
   */
  getRecent(count = 5) {
    const start = Math.max(0, this.records.length - count);
    return this.records.slice(start);
  }

  /**
   * 导出完整历史记录
   * @returns {Array}
   */
  export() {
    return JSON.parse(JSON.stringify(this.records));
  }

  /**
   * 从导出的数据恢复历史记录
   * @param {Array} data - 历史记录数据
   * @throws {Error} 如果数据格式无效
   */
  import(data) {
    if (!Array.isArray(data) || !data.every(d => 
      d.turn !== undefined && 
      d.action && 
      d.state && 
      d.timestamp
    )) {
      throw new Error('Invalid history data format');
    }
    this.records = JSON.parse(JSON.stringify(data));
    this.currentIndex = this.records.length - 1;
  }

  /**
   * 生成历史摘要
   * @param {number} [maxLength=10] - 最大摘要条目数
   * @returns {Array<string>} 摘要文本列表
   */
  summarize(maxLength = 10) {
    return this.records
      .slice(-maxLength)
      .map(record => {
        const { turn, action, result } = record;
        
        switch (action.type) {
          case ActionTypes.DIALOGUE:
            return `回合 ${turn}: 对 ${action.target} ${getIntentText(action.intent)} "${action.content}"` +
                   (result.response ? ` → 回应: "${result.response}"` : '');
          
          case ActionTypes.ACTION:
            return `回合 ${turn}: 执行行动 "${action.content}"` +
                   (result.event ? ` → 触发: ${result.event}` : '');
          
          case ActionTypes.ITEM:
            return `回合 ${turn}: 使用物品 "${action.content}"` +
                   (result.success ? ' (成功)' : ' (失败)');
          
          default:
            return `回合 ${turn}: ${action.type} - ${action.content}`;
        }
      });
      
    function getIntentText(intent) {
      const intentTexts = {
        QUESTION: '询问',
        COMMAND: '命令',
        PERSUADE: '劝说',
        THREATEN: '威胁',
        FLIRT: '调情',
        STATEMENT: '陈述'
      };
      return intentTexts[intent] || `(${intent})`;
    }
  }
}

// 单例模式导出
const gameHistory = new GameHistory();

export default gameHistory;
