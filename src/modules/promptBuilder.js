/**
 * 提示词构建模块
 */
class PromptBuilder {
  constructor() {
    this.templates = {
      characterAction: `你是{character.name}，一个{character.description}。
你的性格是：{character.personality}
你的目标是：{character.goals}
当前场景：{scene.description}
你现在可以采取的行动：{availableActions}
请根据你的性格和目标，选择一个合适的行动：`,
      
      sceneDescription: `描述以下场景：
地点：{scene.location}
时间：{scene.time}
天气：{scene.weather}
存在的角色：{scene.characters}
特殊物品：{scene.objects}
氛围：{scene.mood}`,
      
      dialogueGeneration: `生成{character.name}和{target.name}之间的对话。
{character.name}的性格：{character.personality}
{target.name}的性格：{target.personality}
两人的关系：{relationship}
对话主题：{topic}
对话情境：{context}`,
      
      memoryRecall: `回忆与以下内容相关的记忆：
角色：{character.name}
关键词：{keywords}
时间范围：{timeRange}
相关性阈值：{relevanceThreshold}`
    };
  }

  /**
   * 填充模板
   * @param {string} template - 模板字符串
   * @param {Object} data - 填充数据
   * @returns {string} 填充后的字符串
   */
  fillTemplate(template, data) {
    let result = template;
    
    // 递归处理嵌套属性
    const processNestedProps = (obj, prefix = '') => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          processNestedProps(obj[key], `${prefix}${key}.`);
        } else {
          const placeholder = `{${prefix}${key}}`;
          result = result.replace(new RegExp(placeholder, 'g'), obj[key]);
        }
      }
    };
    
    processNestedProps(data);
    return result;
  }

  /**
   * 构建角色行动提示词
   * @param {Object} character - 角色对象
   * @param {Object} scene - 场景对象
   * @param {Array} availableActions - 可用行动列表
   * @returns {string} 提示词
   */
  buildCharacterActionPrompt(character, scene, availableActions) {
    return this.fillTemplate(this.templates.characterAction, {
      character,
      scene,
      availableActions: availableActions.join('\n- ')
    });
  }

  /**
   * 构建场景描述提示词
   * @param {Object} scene - 场景对象
   * @returns {string} 提示词
   */
  buildSceneDescriptionPrompt(scene) {
    return this.fillTemplate(this.templates.sceneDescription, { scene });
  }

  /**
   * 构建对话生成提示词
   * @param {Object} character - 主角色对象
   * @param {Object} target - 目标角色对象
   * @param {string} relationship - 关系描述
   * @param {string} topic - 对话主题
   * @param {string} context - 对话情境
   * @returns {string} 提示词
   */
  buildDialoguePrompt(character, target, relationship, topic, context) {
    return this.fillTemplate(this.templates.dialogueGeneration, {
      character,
      target,
      relationship,
      topic,
      context
    });
  }

  /**
   * 构建记忆回忆提示词
   * @param {Object} character - 角色对象
   * @param {Array} keywords - 关键词列表
   * @param {string} timeRange - 时间范围
   * @param {number} relevanceThreshold - 相关性阈值
   * @returns {string} 提示词
   */
  buildMemoryRecallPrompt(character, keywords, timeRange, relevanceThreshold) {
    return this.fillTemplate(this.templates.memoryRecall, {
      character,
      keywords: keywords.join(', '),
      timeRange,
      relevanceThreshold
    });
  }

  /**
   * 添加自定义模板
   * @param {string} name - 模板名称
   * @param {string} template - 模板字符串
   */
  addTemplate(name, template) {
    this.templates[name] = template;
  }

  /**
   * 获取模板
   * @param {string} name - 模板名称
   * @returns {string} 模板字符串
   */
  getTemplate(name) {
    return this.templates[name];
  }
}

// 导出单例实例
const promptBuilder = new PromptBuilder();
export default promptBuilder;
