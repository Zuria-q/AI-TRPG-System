import gameState from './game_state';
import agentRegistry from './agent_registry';
import gameHistory from './history';
import memoryInjector from './memory_injector';

/**
 * 提示生成系统
 */
class PromptBuilder {
  constructor() {
    this.templates = {
      default: {
        system: `你是一个AI游戏主持人，请根据以下游戏状态生成合理的剧情发展。\n` +
               `当前场景: {{location}} \n` +
               `参与角色: {{characters}} \n` +
               `最近事件: {{recentEvents}}\n` +
               `相关记忆：{{memories}}`,
        
        character: `角色: {{name}} ({{role}})\n` +
                   `性格: {{personality}} \n` +
                   `状态: {{status}} \n` +
                   `与其他角色的关系: {{relationships}}\n` +
                   `角色记忆：{{memories}}`,
        
        action: `{{actor}} 对 {{target}} 执行了 {{action}} 行为\n` +
                `动机: {{motive}}`
      },
      
      narrative: {
        system: `作为叙事AI，请基于以下游戏状态生成一段生动的剧情描述:\n`,
        context: `场景: {{location}}\n` +
                 `时间: {{time}}\n` +
                 `氛围: {{mood}}`,
        summary: `游戏总结:\n` +
                 `主要角色: {{mainCharacters}}\n` +
                 `关键事件: {{keyEvents}}`
      },
      
      memory: `相关记忆：\n{{memories}}`
    };
  }

  /**
   * 构建系统提示
   * @param {Object} [context] - 上下文数据
   * @returns {string} 完整提示词
   */
  buildSystemPrompt(context = {}) {
    const { agentId, currentLocation } = context;
    
    // 获取角色记忆
    const memoryText = agentId ? 
      memoryInjector.getFormattedMemories(agentId, currentLocation || '') : '';
    
    return this._fillTemplate(this.templates.default.system, {
      location: gameState.currentLocation,
      characters: this._getCharacterList(),
      recentEvents: this._getRecentEvents(),
      memories: memoryText ? this._fillTemplate(this.templates.memory, {
        memories: memoryText
      }) : ''
    });
  }

  /**
   * 构建叙事提示
   * @param {string} [type='context'] - 类型 (context/summary)
   * @returns {string} 生成的提示
   */
  buildNarrativePrompt(type = 'context') {
    const template = this.templates.narrative[type] || this.templates.narrative.context;
    
    return this._fillTemplate(template, {
      location: gameState.currentLocation,
      time: gameState.currentTime || '白天',
      mood: this._getLocationMood(),
      mainCharacters: this._getMainCharacters(),
      keyEvents: gameHistory.summarize(5).join('\n')
    });
  }

  /**
   * 构建角色提示
   * @param {string} agentId - 角色ID
   * @returns {string} 完整提示词
   */
  buildCharacterPrompt(agentId) {
    const agent = agentRegistry.get(agentId);
    if (!agent) return '';
    
    const memoryText = memoryInjector.getFormattedMemories(
      agentId, 
      '当前对话'
    );
    
    return this._fillTemplate(this.templates.default.character, {
      name: agent.name,
      role: agent.role,
      personality: this._describePersonality(agent.personality),
      status: this._describeStatus(agent),
      relationships: this._describeRelationships(agentId),
      memories: memoryText ? `\n角色记忆：\n${memoryText}` : ''
    });
  }

  /**
   * 构建行为提示
   * @param {Object} action - 行为对象
   * @returns {string} 生成的提示
   */
  buildActionPrompt(action) {
    return this._fillTemplate(this.templates.default.action, {
      actor: action.actorId,
      target: action.targetId || '环境',
      action: action.type,
      motive: action.motive || '未知'
    });
  }

  // 私有方法：填充模板
  _fillTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  // 获取角色列表描述
  _getCharacterList() {
    return agentRegistry.getAll().map(
      agent => `${agent.name}(${agent.role || '未知'})`
    ).join(', ');
  }

  // 获取最近事件描述
  _getRecentEvents() {
    return gameHistory.summarize(3).join('； ') || '暂无重要事件';
  }

  // 描述角色性格
  _describePersonality(personality) {
    const traits = [];
    if (personality.openness > 70) traits.push('富有想象力');
    if (personality.conscientiousness > 70) traits.push('认真负责');
    if (personality.extraversion > 70) traits.push('外向开朗');
    if (personality.agreeableness > 70) traits.push('友善亲和');
    if (personality.neuroticism > 70) traits.push('情绪敏感');
    return traits.length ? traits.join('、') : '性格均衡';
  }

  // 描述角色状态
  _describeStatus(agent) {
    const status = [];
    if (agent.health < 30) status.push('受伤');
    if (agent.status?.fatigue) status.push('疲惫');
    return status.length ? status.join('、') : '状态良好';
  }

  // 描述角色关系
  _describeRelationships(agentId) {
    const relationships = [];
    const agent = agentRegistry.get(agentId);
    
    agent.relationships.forEach(rel => {
      const target = agentRegistry.get(rel.targetId);
      if (target) {
        relationships.push(
          `与${target.name}关系: ${rel.type} (亲密度:${rel.closeness})`
        );
      }
    });
    
    return relationships.length ? 
      relationships.join('； ') : '暂无重要关系';
  }

  // 获取场景氛围
  _getLocationMood() {
    const moods = ['平静', '紧张', '欢乐', '神秘', '危险'];
    return moods[Math.floor(Math.random() * moods.length)];
  }

  // 获取主要角色
  _getMainCharacters() {
    const agents = agentRegistry.getAll();
    return agents
      .slice(0, 3)
      .map(agent => agent.name)
      .join('、');
  }
}

// 单例模式导出
const promptBuilder = new PromptBuilder();

export default promptBuilder;
