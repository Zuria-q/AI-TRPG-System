/**
 * 提示词构建器模块
 * 负责构建各种场景下的提示词
 */
import gameState from './game_state';
import agentRegistry from '../agent_registry';

class PromptBuilder {
  constructor() {
    this.templates = {
      // 角色对话模板
      characterDialogue: `你是一个名为{name}的角色，正在参与一个TRPG游戏。请根据以下信息，生成你的回应。

角色信息:
姓名: {name}
性别: {gender}
年龄: {age}
身份/职业: {role}
背景: {background}

性格特点:
{personality}

当前场景:
{scene}

对话历史:
{history}

玩家刚刚的输入:
{playerInput}

请根据你的角色性格和背景，生成一个自然的回应。你可以:
1. 说话 - 使用引号: "你好，我是{name}"
2. 行动 - 使用方括号: 【{name}向前走了几步】
3. 思考 - 使用圆括号: （我应该怎么回应呢）

注意:
- 保持角色的一致性
- 回应应该与当前场景和玩家输入相关
- 可以混合使用对话、行动和思考
- 回应长度控制在100字以内`,

      // 故事开场白模板
      storyOpening: `你是一个TRPG游戏的主持人。请根据以下世界设定生成一段开场白，包括背景介绍和当前场景描述。
使用【】括号标记环境描述和旁白内容。

世界背景:
{background}

当前场景:
{scene}

主要人物:
{characters}

格式要求:
1. 先用【】括号给出环境描述
2. 然后描述当前场景和氛围
3. 总长度控制在300字以内`,

      // 环境更新模板
      environmentUpdate: `你是一个TRPG游戏的主持人。请根据以下信息，生成一段环境更新描述。
使用【】括号标记环境描述和旁白内容。

当前场景:
{scene}

玩家行动:
{playerAction}

NPC响应:
{npcResponses}

请生成一段简短的环境更新描述，包括:
1. 场景变化
2. 时间流逝
3. 环境反应
4. 气氛变化

格式要求:
- 使用【】括号包裹整个描述
- 长度控制在50-100字之间
- 不要重复玩家和NPC已经描述的内容
- 专注于环境和场景的变化`
    };
  }

  /**
   * 构建角色对话提示词
   * @param {Object} character - 角色对象
   * @param {Object} context - 上下文信息
   * @returns {string} 提示词
   */
  buildCharacterDialoguePrompt(character, context) {
    if (!character) {
      throw new Error('缺少角色信息');
    }

    // 处理性格特点
    let personalityText = '';
    if (character.personality) {
      personalityText = `开放性: ${character.personality.openness || 50}/100
尽责性: ${character.personality.conscientiousness || 50}/100
外向性: ${character.personality.extraversion || 50}/100
亲和性: ${character.personality.agreeableness || 50}/100
神经质: ${character.personality.neuroticism || 50}/100`;
    }

    // 处理历史对话
    let historyText = '(无历史对话)';
    if (context.history && Array.isArray(context.history) && context.history.length > 0) {
      historyText = context.history.map(msg => {
        return `${msg.senderName || msg.sender}: ${msg.text}`;
      }).join('\n');
    }

    // 填充模板
    return this.templates.characterDialogue
      .replace('{name}', character.name || '未知角色')
      .replace(/\{name\}/g, character.name || '未知角色')
      .replace('{gender}', character.gender || '未知')
      .replace('{age}', character.age || '未知')
      .replace('{role}', character.role || '未知')
      .replace('{background}', character.background || '无特定背景')
      .replace('{personality}', personalityText)
      .replace('{scene}', context.scene || '一个普通场景')
      .replace('{history}', historyText)
      .replace('{playerInput}', context.playerInput || '(无玩家输入)');
  }

  /**
   * 构建故事开场白提示词
   * @param {Object} worldSettings - 世界设定
   * @returns {string} 提示词
   */
  buildStoryOpeningPrompt(worldSettings) {
    if (!worldSettings) {
      throw new Error('缺少世界设定信息');
    }

    // 获取角色摘要
    const characterSummary = this._getCharacterSummary();

    // 填充模板
    return this.templates.storyOpening
      .replace('{background}', worldSettings.background || '一个普通的幻想世界')
      .replace('{scene}', worldSettings.currentScene || '一个普通的起始位置')
      .replace('{characters}', characterSummary);
  }

  /**
   * 构建环境更新提示词
   * @param {Object} context - 上下文信息
   * @returns {string} 提示词
   */
  buildEnvironmentUpdatePrompt(context) {
    if (!context) {
      throw new Error('缺少上下文信息');
    }

    // 处理NPC响应
    let npcResponsesText = '(无NPC响应)';
    if (context.npcResponses && Array.isArray(context.npcResponses) && context.npcResponses.length > 0) {
      npcResponsesText = context.npcResponses.map(resp => {
        return `${resp.senderName || resp.sender}: ${resp.text}`;
      }).join('\n');
    }

    // 填充模板
    return this.templates.environmentUpdate
      .replace('{scene}', context.scene || '一个普通场景')
      .replace('{playerAction}', context.playerAction || '(无玩家行动)')
      .replace('{npcResponses}', npcResponsesText);
  }

  /**
   * 获取角色摘要信息
   * @returns {string} 角色摘要
   */
  _getCharacterSummary() {
    const allAgents = agentRegistry.getAllAgents();
    const characters = Object.values(allAgents);
    
    if (characters.length === 0) {
      return '暂无角色信息';
    }
    
    return characters.map(char => 
      `${char.name}: ${char.type === 'player' ? '玩家角色' : (char.type === 'gm' ? '主持人' : 'NPC')}, ${char.role || '未知身份'}`
    ).join('\n');
  }

  /**
   * 添加自定义模板
   * @param {string} name - 模板名称
   * @param {string} template - 模板内容
   */
  addTemplate(name, template) {
    if (!name || !template) {
      throw new Error('模板名称和内容不能为空');
    }
    
    this.templates[name] = template;
  }

  /**
   * 获取模板
   * @param {string} name - 模板名称
   * @returns {string} 模板内容
   */
  getTemplate(name) {
    return this.templates[name];
  }
}

// 单例模式导出
const promptBuilder = new PromptBuilder();
export default promptBuilder;
