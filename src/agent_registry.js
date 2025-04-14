import { validateState } from './game_state';

/**
 * 大五人格特征
 * @typedef {Object} BigFiveTraits
 * @property {number} openness - 开放性 (0-100)
 * @property {number} conscientiousness - 尽责性 (0-100)
 * @property {number} extraversion - 外向性 (0-100)
 * @property {number} agreeableness - 宜人性 (0-100)
 * @property {number} neuroticism - 神经质 (0-100)
 */

/**
 * 角色技能
 * @typedef {Object} CharacterSkill
 * @property {string} name - 技能名称
 * @property {number} level - 技能等级 (1-10)
 * @property {string} description - 技能描述
 */

/**
 * 角色关系类型
 * @typedef {'neutral'|'friend'|'family'|'rival'|'lover'|'colleague'} RelationshipType
 */

/**
 * 角色关系
 * @typedef {Object} CharacterRelationship
 * @property {string} targetId - 目标角色ID
 * @property {RelationshipType} type - 关系类型
 * @property {number} closeness - 亲密程度 (0-100)
 */

/**
 * 语音风格
 * @typedef {'neutral'|'gentle'|'angry'|'cheerful'|'serious'|'timid'} VoiceStyle
 */

/**
 * 角色卡定义
 * @typedef {Object} AgentProfile
 * @property {string} id - 角色唯一ID
 * @property {string} name - 角色名称
 * @property {string} gender - 性别
 * @property {number} age - 年龄
 * @property {string} role - 身份/职业
 * @property {string} background - 背景故事
 * @property {BigFiveTraits} personality - 大五人格特征
 * @property {Array<CharacterSkill>} skills - 技能列表
 * @property {Array<CharacterRelationship>} relationships - 关系网络
 * @property {Array<string>} behaviorTags - 行为标签
 * @property {VoiceStyle} voiceStyle - 语音风格
 */

// 默认人格模板
const DEFAULT_PERSONALITY = {
  openness: 50,
  conscientiousness: 50,
  extraversion: 50,
  agreeableness: 50,
  neuroticism: 50
};

/**
 * 创建新角色
 * @param {Object} config - 角色配置
 * @returns {AgentProfile} 创建的角色卡
 * @throws {Error} 如果配置无效
 */
export function createAgent(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('配置必须是一个对象');
  }
  
  if (!config.name || typeof config.name !== 'string' || config.name.trim().length < 2) {
    throw new Error('角色名称(name)必须是一个至少2个字符的字符串');
  }
  
  if (config.age && (typeof config.age !== 'number' || config.age < 0 || config.age > 150)) {
    throw new Error('年龄(age)必须是0到150之间的数字');
  }
  
  return {
    id: config.id || `char_${Date.now()}`,
    name: config.name.trim(),
    gender: config.gender || 'unknown',
    age: config.age || 25,
    role: config.role || '平民',
    background: config.background || '',
    personality: validatePersonality(config.personality),
    skills: validateSkills(config.skills),
    relationships: validateRelationships(config.relationships),
    behaviorTags: validateTags(config.behaviorTags),
    voiceStyle: validateVoiceStyle(config.voiceStyle)
  };
  
  function validatePersonality(personality) {
    const valid = { ...DEFAULT_PERSONALITY };
    if (personality) {
      for (const trait in DEFAULT_PERSONALITY) {
        if (personality[trait] !== undefined) {
          valid[trait] = Math.min(100, Math.max(0, personality[trait]));
        }
      }
    }
    return valid;
  }
  
  function validateSkills(skills) {
    if (!Array.isArray(skills)) return [];
    return skills.filter(skill => 
      skill && 
      skill.name && 
      typeof skill.level === 'number'
    );
  }
  
  function validateRelationships(relationships) {
    if (!Array.isArray(relationships)) return [];
    return relationships.filter(rel => 
      rel && 
      rel.targetId && 
      typeof rel.closeness === 'number'
    );
  }
  
  function validateTags(tags) {
    if (!Array.isArray(tags)) return [];
    return tags.filter(tag => typeof tag === 'string');
  }
  
  function validateVoiceStyle(style) {
    const validStyles = ['neutral', 'gentle', 'angry', 'cheerful', 'serious', 'timid'];
    return validStyles.includes(style) ? style : 'neutral';
  }
}

/**
 * 角色注册表
 */
class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  /**
   * 注册角色
   * @param {AgentProfile} agent 
   * @throws {Error} 如果角色无效或ID重复
   */
  register(agent) {
    if (!agent || !agent.id) {
      throw new Error('角色必须包含ID');
    }
    
    if (this.agents.has(agent.id)) {
      throw new Error(`角色ID ${agent.id} 已存在`);
    }
    
    this.agents.set(agent.id, agent);
  }

  /**
   * 获取角色
   * @param {string} id 
   * @returns {AgentProfile|undefined}
   */
  get(id) {
    return this.agents.get(id);
  }

  /**
   * 获取所有角色
   * @returns {Array<AgentProfile>}
   */
  getAll() {
    return Array.from(this.agents.values());
  }

  /**
   * 更新角色关系
   * @param {string} sourceId - 源角色ID
   * @param {string} targetId - 目标角色ID
   * @param {number} delta - 关系变化值 (-100到100)
   * @param {RelationshipType} [newType] - 可选的新关系类型
   */
  updateRelationship(sourceId, targetId, delta, newType) {
    const agent = this.get(sourceId);
    if (!agent) return;

    let relation = agent.relationships.find(r => r.targetId === targetId);
    if (!relation) {
      relation = { 
        targetId, 
        type: newType || 'neutral', 
        closeness: 50 
      };
      agent.relationships.push(relation);
    }
    
    // 更新亲密值
    relation.closeness = Math.min(100, Math.max(0, relation.closeness + delta));
    
    // 更新关系类型
    if (newType) {
      relation.type = newType;
    }
    
    // 自动调整关系类型基于亲密值
    if (relation.closeness >= 80 && relation.type !== 'lover') {
      relation.type = 'friend';
    } else if (relation.closeness <= 20 && relation.type !== 'rival') {
      relation.type = 'neutral';
    }
  }
}

// 单例模式导出
const agentRegistry = new AgentRegistry();

export default agentRegistry;
export { createAgent };
