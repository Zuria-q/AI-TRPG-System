import gameState from './game_state';
import trustMap from './trust_map';
import agentRegistry from './agent_registry';
import llmIntegration from './llm_integration';

/**
 * 故事评估系统
 */
class StoryEvaluator {
  constructor() {
    this.ratingScale = {
      S: { min: 90, label: '完美结局' },
      A: { min: 75, label: '优秀结局' },
      B: { min: 60, label: '良好结局' },
      C: { min: 40, label: '普通结局' },
      D: { min: 20, label: '糟糕结局' },
      F: { min: 0,  label: '悲剧结局' }
    };
  }

  /**
   * 评估游戏结局
   * @returns {Promise<Object>} 评估结果
   */
  async evaluate() {
    // 计算关键指标
    const metrics = this._calculateMetrics();
    
    // 生成LLM评估
    const llmEvaluation = await this._getLLMEvaluation(metrics);
    
    // 确定评级
    const rating = this._determineRating(metrics.totalScore);
    
    return {
      rating,
      metrics,
      evaluation: llmEvaluation,
      suggestions: llmEvaluation.suggestions || []
    };
  }

  /**
   * 计算关键指标
   * @private
   */
  _calculateMetrics() {
    const agents = agentRegistry.getAll();
    const playerId = gameState.playerId;
    
    // 基础指标
    const metrics = {
      survivalRate: agents.filter(a => a.status?.alive).length / agents.length,
      avgTrust: trustMap.getAverageTrust(playerId),
      completionRate: gameState.getCompletionRate(),
      keyEventCount: gameState.history.getKeyEventCount()
    };
    
    // 计算总分（加权）
    metrics.totalScore = Math.round(
      metrics.survivalRate * 40 +
      metrics.avgTrust * 30 +
      metrics.completionRate * 20 +
      Math.min(10, metrics.keyEventCount / 2)
    );
    
    return metrics;
  }

  /**
   * 获取LLM评估
   * @private
   */
  async _getLLMEvaluation(metrics) {
    const prompt = `作为游戏叙事分析师，请评估以下游戏结果：\n` +
      `存活率: ${Math.round(metrics.survivalRate * 100)}%\n` +
      `平均信任度: ${Math.round(metrics.avgTrust)}/100\n` +
      `关键事件数: ${metrics.keyEventCount}\n\n` +
      `请用中文给出：1. 简洁评价 2. 三个改进建议`;
    
    const response = await llmIntegration.generateResponse('evaluation', {
      metrics
    }, {
      temperature: 0.5,
      max_tokens: 300
    });
    
    return {
      summary: response.split('\n')[0] || response,
      suggestions: response.split('\n').slice(1).filter(s => s.trim())
    };
  }

  /**
   * 确定结局评级
   * @private
   */
  _determineRating(score) {
    for (const [grade, { min, label }] of Object.entries(this.ratingScale)) {
      if (score >= min) {
        return { grade, label, score };
      }
    }
    return { grade: 'F', label: '悲剧结局', score };
  }
}

export default new StoryEvaluator();
