/**
 * 角色关系信任网络模块
 */
class TrustMap {
  constructor() {
    this.relationships = {};
    this.defaultTrust = 0;
  }

  /**
   * 初始化关系网络
   * @param {Array} agents - 角色ID列表
   */
  initialize(agents) {
    try {
      agents.forEach(agentId => {
        if (!this.relationships[agentId]) {
          this.relationships[agentId] = {};
        }
        
        agents.forEach(targetId => {
          if (agentId !== targetId && !this.relationships[agentId][targetId]) {
            this.relationships[agentId][targetId] = this.defaultTrust;
          }
        });
      });
      return true;
    } catch (error) {
      console.error('初始化信任网络失败:', error, '角色列表:', agents);
      return false;
    }
  }

  /**
   * 设置信任值
   * @param {string} sourceId - 源角色ID
   * @param {string} targetId - 目标角色ID
   * @param {number} value - 信任值
   */
  setTrust(sourceId, targetId, value) {
    if (!this.relationships[sourceId]) {
      this.relationships[sourceId] = {};
    }
    
    this.relationships[sourceId][targetId] = Math.max(-1, Math.min(1, value));
  }

  /**
   * 获取信任值
   * @param {string} sourceId - 源角色ID
   * @param {string} targetId - 目标角色ID
   * @returns {number} 信任值
   */
  getTrust(sourceId, targetId) {
    if (!this.relationships[sourceId] || this.relationships[sourceId][targetId] === undefined) {
      return this.defaultTrust;
    }
    
    return this.relationships[sourceId][targetId];
  }

  /**
   * 更新信任值
   * @param {string} sourceId - 源角色ID
   * @param {string} targetId - 目标角色ID
   * @param {number} delta - 信任值变化
   * @returns {number} 新的信任值
   */
  updateTrust(sourceId, targetId, delta) {
    const currentTrust = this.getTrust(sourceId, targetId);
    const newTrust = Math.max(-1, Math.min(1, currentTrust + delta));
    
    this.setTrust(sourceId, targetId, newTrust);
    return newTrust;
  }

  /**
   * 获取角色的所有关系
   * @param {string} agentId - 角色ID
   * @returns {Object} 关系对象
   */
  getRelationships(agentId) {
    return this.relationships[agentId] || {};
  }

  /**
   * 获取所有角色之间的关系
   * @returns {Object} 所有关系
   */
  getAllRelationships() {
    return this.relationships;
  }

  /**
   * 计算两个角色之间的互信度
   * @param {string} agentId1 - 角色1 ID
   * @param {string} agentId2 - 角色2 ID
   * @returns {number} 互信度
   */
  getMutualTrust(agentId1, agentId2) {
    const trust1 = this.getTrust(agentId1, agentId2);
    const trust2 = this.getTrust(agentId2, agentId1);
    
    return (trust1 + trust2) / 2;
  }

  /**
   * 根据事件更新关系
   * @param {Object} event - 事件对象
   */
  processEvent(event) {
    if (!event || !event.type || !event.source || !event.target) {
      return;
    }
    
    let delta = 0;
    
    switch (event.type) {
      case 'help':
        delta = 0.1;
        break;
      case 'harm':
        delta = -0.2;
        break;
      case 'betray':
        delta = -0.3;
        break;
      case 'gift':
        delta = 0.15;
        break;
      case 'cooperate':
        delta = 0.1;
        break;
      default:
        delta = 0;
    }
    
    if (delta !== 0) {
      this.updateTrust(event.target, event.source, delta);
    }
  }
}

// 导出单例实例
const trustMap = new TrustMap();
export default trustMap;
