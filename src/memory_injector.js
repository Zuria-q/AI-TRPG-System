import memoryStore from './memory_store';

/**
 * 记忆注入系统
 * 负责将相关记忆注入到LLM提示词中
 */
class MemoryInjector {
  constructor() {
    this.enabled = true; // 全局记忆开关
    this.injectionConfig = {
      maxMemories: 3,    // 最大注入记忆条数
      maxTokens: 300,    // 最大记忆token数
      minRelevance: 0.5  // 最低相关性阈值
    };
  }

  /**
   * 获取并格式化角色记忆
   * @param {string} agentId - 角色ID
   * @param {string} context - 当前对话上下文
   * @returns {string} 格式化后的记忆文本
   */
  getFormattedMemories(agentId, context) {
    if (!this.enabled) return '';
    
    // 获取相关记忆
    const memories = memoryStore.getRelevantMemories(
      agentId, 
      context,
      this.injectionConfig.maxMemories
    ).filter(m => m.score >= this.injectionConfig.minRelevance);
    
    if (memories.length === 0) return '';
    
    // 格式化记忆文本
    return memories.map(memory => {
      const timeAgo = this._formatTimeAgo(memory.timestamp);
      return `[${timeAgo}前] ${memory.content}（重要性: ${'★'.repeat(memory.importance)}）`;
    }).join('\n\n');
  }

  /**
   * 更新注入配置
   * @param {Object} config - 新配置
   */
  updateConfig(config) {
    Object.assign(this.injectionConfig, config);
  }

  /**
   * 格式化时间差
   * @private
   */
  _formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时`;
    return `${Math.floor(seconds / 86400)}天`;
  }
}

// 单例模式导出
const memoryInjector = new MemoryInjector();
export default memoryInjector;
