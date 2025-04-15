/**
 * 定义游戏中可用的行为空间
 * 包括对话、行动和物品操作三大类
 */
class ActionSpace {
  constructor() {
    // 行为类型常量
    this.ACTION_TYPES = {
      DIALOGUE: 'dialogue',
      ACTION: 'action',
      ITEM: 'item'
    };
    
    // 对话行为模板
    this.dialogueTemplate = {
      type: this.ACTION_TYPES.DIALOGUE,
      content: '',       // 对话内容
      target: null,      // 对话目标角色ID
      tone: 'neutral',   // 语气: friendly, neutral, hostile
      private: false     // 是否私密对话
    };
    
    // 行动行为模板
    this.actionTemplate = {
      type: this.ACTION_TYPES.ACTION,
      action: '',        // 行动描述
      target: null,      // 行动目标(可以是角色ID、物品ID或位置ID)
      difficulty: 0,     // 难度系数(0-10)
      consequences: []   // 可能的后果列表
    };
    
    // 物品操作模板
    this.itemTemplate = {
      type: this.ACTION_TYPES.ITEM,
      operation: '',     // 操作类型: use, take, give, examine
      itemId: null,      // 物品ID
      target: null,      // 目标(给予物品时的接收者)
      quantity: 1        // 数量
    };
  }

  /**
   * 创建对话行为
   * @param {string} content - 对话内容
   * @param {string} target - 对话目标角色ID
   * @param {string} tone - 语气
   * @param {boolean} isPrivate - 是否私密对话
   * @returns {Object} 对话行为对象
   */
  createDialogue(content, target, tone = 'neutral', isPrivate = false) {
    return {
      ...this.dialogueTemplate,
      content,
      target,
      tone,
      private: isPrivate,
      timestamp: Date.now()
    };
  }

  /**
   * 创建行动行为
   * @param {string} action - 行动描述
   * @param {string} target - 行动目标
   * @param {number} difficulty - 难度系数
   * @param {Array} consequences - 可能的后果
   * @returns {Object} 行动行为对象
   */
  createAction(action, target = null, difficulty = 0, consequences = []) {
    return {
      ...this.actionTemplate,
      action,
      target,
      difficulty,
      consequences,
      timestamp: Date.now()
    };
  }

  /**
   * 创建物品操作行为
   * @param {string} operation - 操作类型
   * @param {string} itemId - 物品ID
   * @param {string} target - 目标
   * @param {number} quantity - 数量
   * @returns {Object} 物品操作行为对象
   */
  createItemOperation(operation, itemId, target = null, quantity = 1) {
    return {
      ...this.itemTemplate,
      operation,
      itemId,
      target,
      quantity,
      timestamp: Date.now()
    };
  }

  /**
   * 验证行为是否合法
   * @param {Object} action - 行为对象
   * @returns {boolean} 是否合法
   */
  validateAction(action) {
    if (!action || !action.type) {
      return false;
    }

    switch (action.type) {
      case this.ACTION_TYPES.DIALOGUE:
        return Boolean(action.content && action.content.trim());
      
      case this.ACTION_TYPES.ACTION:
        return Boolean(action.action && action.action.trim());
      
      case this.ACTION_TYPES.ITEM:
        return Boolean(action.operation && action.itemId);
      
      default:
        return false;
    }
  }

  /**
   * 获取可用行为类型列表
   * @returns {Array} 行为类型列表
   */
  getActionTypes() {
    return Object.values(this.ACTION_TYPES);
  }

  /**
   * 获取指定类型的行为模板
   * @param {string} type - 行为类型
   * @returns {Object} 行为模板
   */
  getTemplateByType(type) {
    switch (type) {
      case this.ACTION_TYPES.DIALOGUE:
        return this.dialogueTemplate;
      
      case this.ACTION_TYPES.ACTION:
        return this.actionTemplate;
      
      case this.ACTION_TYPES.ITEM:
        return this.itemTemplate;
      
      default:
        return null;
    }
  }
}

// 导出单例实例
const actionSpace = new ActionSpace();

// 导出与src/action_space.js兼容的ActionTypes
export const ActionTypes = {
  DIALOGUE: 'DIALOGUE',
  ACTION: 'ACTION',
  ITEM: 'ITEM'
};

export default actionSpace;
