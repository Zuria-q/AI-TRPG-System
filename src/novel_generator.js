import gameHistory from './history';
import agentRegistry from './agent_registry';
import llmIntegration from './llm_integration';

/**
 * 小说生成系统
 */
class NovelGenerator {
  constructor() {
    this.styleTemplates = {
      default: '以中立客观的叙事风格',
      dramatic: '以戏剧化的小说风格',
      mystery: '以悬疑推理的写作风格',
      romantic: '以浪漫主义的文学风格'
    };
  }

  /**
   * 生成完整故事
   * @param {string} [style='default'] - 写作风格
   * @returns {Promise<string>} 生成的小说文本
   */
  async generateNovel(style = 'default') {
    // 准备历史数据
    const history = gameHistory.getAll();
    const characters = this._getCharacterDescriptions();
    
    // 构建LLM提示
    const prompt = `根据以下游戏历史生成${this.styleTemplates[style] || ''}的小说：\n\n` +
      `## 角色介绍\n${characters}\n\n` +
      `## 关键事件\n${this._formatEvents(history)}\n\n` +
      `要求：\n1. 保持时间线连贯\n2. 突出角色性格\n3. 包含关键决策点`;
    
    // 调用LLM生成
    return await llmIntegration.generateResponse('novel', {
      history,
      style
    }, {
      temperature: 0.7,
      max_tokens: 1500
    });
  }

  /**
   * 格式化角色描述
   * @private
   */
  _getCharacterDescriptions() {
    return agentRegistry.getAll()
      .map(agent => {
        return `- ${agent.name}（${agent.role}）：${agent.personality}\n  关系：${this._describeRelationships(agent.id)}`;
      })
      .join('\n');
  }

  /**
   * 格式化历史事件
   * @private
   */
  _formatEvents(history) {
    return history
      .filter(event => event.isMajor)
      .map(event => {
        return `[${event.turn}回合] ${event.actorId} -> ${event.action.type}: ${event.description || ''}`;
      })
      .join('\n');
  }

  /**
   * 描述角色关系
   * @private
   */
  _describeRelationships(agentId) {
    const relationships = agentRegistry.getRelationships(agentId);
    return Object.entries(relationships)
      .map(([otherId, relation]) => {
        return `${otherId}(${relation})`;
      })
      .join(', ') || '无特殊关系';
  }
}

export default new NovelGenerator();
