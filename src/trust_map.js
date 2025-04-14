import agentRegistry from './agent_registry';

/**
 * 信任度管理系统
 */
class TrustMap {
  constructor() {
    this.trustMatrix = new Map();
    this.globalTrustModifier = 1.0; // 全局信任修正系数 (0.5-2.0)
    this.propagationThreshold = 5;  // 信任变化阈值，超过此值才触发传播
    this._loadFromStorage();
  }

  /**
   * 设置全局信任修正系数
   * @param {number} modifier - 新修正系数 (0.5-2.0)
   */
  setGlobalModifier(modifier) {
    this.globalTrustModifier = Math.min(2.0, Math.max(0.5, modifier));
    this._saveToStorage();
  }

  /**
   * 初始化角色信任矩阵
   * @param {Array<string>} agentIds - 所有角色ID列表
   * @param {number} [initialTrust=50] - 初始信任值 (0-100)
   */
  initialize(agentIds, initialTrust = 50) {
    if (!Array.isArray(agentIds)) return;
    
    this.trustMatrix.clear();
    
    // 为每个角色创建信任记录
    agentIds.forEach(sourceId => {
      const trustRecord = new Map();
      agentIds.forEach(targetId => {
        // 默认自己信任自己100
        const value = sourceId === targetId ? 100 : initialTrust;
        trustRecord.set(targetId, value);
      });
      this.trustMatrix.set(sourceId, trustRecord);
    });
  }

  /**
   * 更新信任值
   * @param {string} sourceId - 源角色ID
   * @param {string} targetId - 目标角色ID
   * @param {number} delta - 信任变化值 (-100到100)
   * @param {boolean} [isReciprocal=true] - 是否产生互惠信任变化
   */
  updateTrust(sourceId, targetId, delta, isReciprocal = true) {
    if (sourceId === targetId) return;
    
    // 更新正向信任
    this._updateSingleTrust(sourceId, targetId, delta);
    
    // 互惠信任变化
    if (isReciprocal) {
      const reciprocalDelta = delta * 0.3 * this.globalTrustModifier;
      this._updateSingleTrust(targetId, sourceId, reciprocalDelta);
    }
    
    // 仅在变化较大时触发传播
    if (Math.abs(delta) > this.propagationThreshold) {
      this._propagateTrust(sourceId, targetId, delta);
    }
    
    this._saveToStorage();
  }

  /**
   * 获取信任值
   * @param {string} sourceId 
   * @param {string} targetId 
   * @returns {number} 信任值 (0-100)
   */
  getTrust(sourceId, targetId) {
    const trustRecord = this.trustMatrix.get(sourceId);
    return trustRecord?.get(targetId) ?? 50; // 默认返回中性值
  }

  /**
   * 获取角色对所有其他角色的信任映射
   * @param {string} sourceId
   * @returns {Map<string, number>}
   */
  getAllTrusts(sourceId) {
    return this.trustMatrix.get(sourceId) || new Map();
  }

  // 私有方法：更新单个信任关系
  _updateSingleTrust(sourceId, targetId, delta) {
    const trustRecord = this.trustMatrix.get(sourceId);
    if (!trustRecord) return;
    
    const current = trustRecord.get(targetId) ?? 50;
    const newValue = Math.min(100, Math.max(0, current + delta));
    trustRecord.set(targetId, newValue);
    
    // 同步更新角色关系
    agentRegistry.updateRelationship(sourceId, targetId, delta / 2);
  }

  // 私有方法：信任传播逻辑（优化版）
  _propagateTrust(sourceId, targetId, delta) {
    const propagationFactor = 0.15 * this.globalTrustModifier;
    const sourceTrusts = this.getAllTrusts(sourceId);
    const targetTrusts = this.getAllTrusts(targetId);
    
    // 限制传播范围（最多处理10个关系）
    let count = 0;
    for (const [id, trust] of sourceTrusts) {
      if (count >= 10) break;
      if (id !== targetId && id !== sourceId) {
        const targetToOther = targetTrusts.get(id) ?? 50;
        const influence = (targetToOther / 100) * delta * propagationFactor;
        this._updateSingleTrust(sourceId, id, influence);
        count++;
      }
    }
  }

  // 私有方法：保存到本地存储
  _saveToStorage() {
    try {
      const data = {
        matrix: Array.from(this.trustMatrix.entries()),
        modifier: this.globalTrustModifier
      };
      localStorage.setItem('trustMapData', JSON.stringify(data));
    } catch (e) {
      console.error('信任矩阵保存失败:', e);
    }
  }

  // 私有方法：从本地存储加载
  _loadFromStorage() {
    try {
      const data = localStorage.getItem('trustMapData');
      if (data) {
        const parsed = JSON.parse(data);
        this.trustMatrix = new Map(parsed.matrix);
        this.globalTrustModifier = parsed.modifier || 1.0;
      }
    } catch (e) {
      console.error('信任矩阵加载失败:', e);
    }
  }
}

// 单例模式导出
const trustMap = new TrustMap();

export default trustMap;
