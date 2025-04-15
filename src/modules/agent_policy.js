/**
 * 角色行为策略管理模块
 */
class AgentPolicy {
  constructor() {
    this.policies = {};
    this.globalRules = [];
  }

  /**
   * 添加全局规则
   * @param {Object} rule - 规则对象
   */
  addGlobalRule(rule) {
    this.globalRules.push(rule);
  }

  /**
   * 获取全局规则
   * @returns {Array} 全局规则列表
   */
  getGlobalRules() {
    return this.globalRules;
  }

  /**
   * 为角色设置策略
   * @param {string} agentId - 角色ID
   * @param {Object} policy - 策略对象
   */
  setPolicy(agentId, policy) {
    this.policies[agentId] = policy;
  }

  /**
   * 获取角色策略
   * @param {string} agentId - 角色ID
   * @returns {Object} 策略对象
   */
  getPolicy(agentId) {
    return this.policies[agentId] || null;
  }

  /**
   * 评估行动是否符合策略
   * @param {string} agentId - 角色ID
   * @param {Object} action - 行动对象
   * @returns {boolean} 是否符合策略
   */
  evaluateAction(agentId, action) {
    // 检查全局规则
    for (const rule of this.globalRules) {
      if (rule.condition(action) && !rule.allow) {
        return false;
      }
    }
    
    // 检查角色特定策略
    const policy = this.getPolicy(agentId);
    if (!policy) {
      return true; // 没有策略则默认允许
    }
    
    if (policy.rules) {
      for (const rule of policy.rules) {
        if (rule.condition(action) && !rule.allow) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * 为角色生成可能的行动
   * @param {string} agentId - 角色ID
   * @param {Object} context - 上下文对象
   * @returns {Array} 可能的行动列表
   */
  generatePossibleActions(agentId, context) {
    const policy = this.getPolicy(agentId);
    if (!policy || !policy.actionGenerators) {
      return [];
    }
    
    let actions = [];
    for (const generator of policy.actionGenerators) {
      const generatedActions = generator(context);
      if (Array.isArray(generatedActions)) {
        actions = [...actions, ...generatedActions];
      }
    }
    
    // 过滤掉不符合策略的行动
    return actions.filter(action => this.evaluateAction(agentId, action));
  }

  /**
   * 清除角色策略
   * @param {string} agentId - 角色ID
   */
  clearPolicy(agentId) {
    delete this.policies[agentId];
  }
}

// 导出单例实例
const agentPolicy = new AgentPolicy();
export default agentPolicy;
