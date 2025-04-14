import agentRegistry from './agent_registry';
import trustMap from './trust_map';
import gameHistory from './history';

/**
 * 行为动机类型
 * @typedef {'neutral'|'supportive'|'aggressive'|'defensive'} ActionMotive
 */

/**
 * NPC决策系统
 */
class AgentPolicy {
  constructor() {
    this.policyWeights = {
      default: { trust: 0.6, relationship: 0.3, random: 0.1 },
      cautious: { trust: 0.8, relationship: 0.1, random: 0.1 },
      aggressive: { trust: 0.4, relationship: 0.5, random: 0.1 },
      friendly: { trust: 0.3, relationship: 0.6, random: 0.1 }
    };
    this.debugMode = true; // 调试模式开关
  }

  /**
   * 获取NPC的行为决策
   * @param {string} agentId - NPC角色ID
   * @param {Array<Object>} availableActions - 可用行为列表
   * @param {Object} [context] - 决策上下文
   * @returns {Object} 选择的行为和候选列表
   */
  decideAction(agentId, availableActions, context = {}) {
    if (!availableActions?.length) return { action: null, candidates: [] };
    
    const agent = agentRegistry.get(agentId);
    if (!agent) return { action: null, candidates: [] };
    
    // 获取最近互动历史
    const recentHistory = gameHistory.getRecent(agentId, 3);
    
    // 获取决策策略
    const policyType = this._determinePolicyType(agent, recentHistory);
    const weights = this.policyWeights[policyType] || this.policyWeights.default;
    
    // 计算每个行为的得分
    const scoredActions = availableActions.map(action => {
      const targetId = action.targetId || action.target;
      
      // 基础得分计算
      let trustScore = this._calculateTrustScore(agentId, targetId);
      let relationScore = this._calculateRelationScore(agentId, targetId);
      
      // 根据行为动机调整得分
      if (action.motive === 'aggressive') {
        trustScore = 1 - trustScore;
        relationScore = 1 - relationScore;
      } else if (action.motive === 'defensive') {
        trustScore = 0.5 + (trustScore - 0.5) * 0.7;
        relationScore = 0.5 + (relationScore - 0.5) * 0.7;
      }
      
      // 历史因素调整
      const historyFactor = this._calculateHistoryFactor(recentHistory, targetId);
      
      const randomFactor = Math.random();
      const finalScore = 
        trustScore * weights.trust + 
        relationScore * weights.relationship + 
        historyFactor * 0.2 + 
        randomFactor * weights.random;
      
      return { action, score: finalScore };
    });
    
    // 按得分排序
    const sortedActions = scoredActions.sort((a, b) => b.score - a.score);
    const topActions = sortedActions.slice(0, 3);
    
    // 调试日志
    if (this.debugMode) {
      console.group(`[Agent ${agentId}] Decision`);
      console.log('Policy:', policyType);
      topActions.forEach((item, i) => {
        console.log(`${i+1}. ${item.action.content} (score: ${item.score.toFixed(2)})`);
      });
      console.groupEnd();
    }
    
    return {
      action: topActions[0].action,
      candidates: topActions
    };
  }

  // 计算历史因素影响
  _calculateHistoryFactor(recentHistory, targetId) {
    if (!recentHistory?.length) return 0.5;
    
    const relatedEvents = recentHistory.filter(
      event => event.targetId === targetId || event.sourceId === targetId
    );
    
    if (!relatedEvents.length) return 0.5;
    
    // 简单计算：正向事件加分，负向事件减分
    let score = 0.5;
    relatedEvents.forEach(event => {
      if (event.result?.positive) score += 0.1;
      if (event.result?.negative) score -= 0.1;
    });
    
    return Math.min(1, Math.max(0, score));
  }

  /**
   * 根据角色性格和最近互动历史确定决策策略
   * @private
   * @param {Object} agent - 角色数据
   * @param {Array<Object>} recentHistory - 最近互动历史
   * @returns {PolicyType} 策略类型
   */
  _determinePolicyType(agent, recentHistory) {
    const { personality } = agent;
    
    if (personality.neuroticism > 70) return 'cautious';
    if (personality.agreeableness < 30) return 'aggressive';
    if (personality.agreeableness > 70) return 'friendly';
    
    // 根据最近互动历史调整策略
    if (recentHistory.some(event => event.result?.negative)) return 'defensive';
    if (recentHistory.some(event => event.result?.positive)) return 'supportive';
    
    return 'default';
  }

  /**
   * 计算行为信任得分
   * @private
   * @param {string} agentId - NPC角色ID
   * @param {string} targetId - 目标角色ID
   * @returns {number} 得分 (0-1)
   */
  _calculateTrustScore(agentId, targetId) {
    if (!targetId) return 0.5;
    
    const trustValue = trustMap.getTrust(agentId, targetId);
    return trustValue / 100;
  }

  /**
   * 计算行为关系得分
   * @private
   * @param {string} agentId - NPC角色ID
   * @param {string} targetId - 目标角色ID
   * @returns {number} 得分 (0-1)
   */
  _calculateRelationScore(agentId, targetId) {
    if (!targetId) return 0.5;
    
    const agent = agentRegistry.get(agentId);
    const relation = agent.relationships.find(r => r.targetId === targetId);
    
    if (!relation) return 0.5;
    
    // 根据关系类型调整基础分
    let baseScore = 0.5;
    switch (relation.type) {
      case 'friend': baseScore = 0.8; break;
      case 'family': baseScore = 0.9; break;
      case 'rival': baseScore = 0.3; break;
      case 'lover': baseScore = 1.0; break;
    }
    
    // 根据亲密程度微调
    return baseScore * (0.5 + relation.closeness / 200);
  }
}

// 单例模式导出
const agentPolicy = new AgentPolicy();

export default agentPolicy;
