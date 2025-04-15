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
    this.hasPlayerCharacter = true; // 默认有玩家角色
    
    // 初始化默认角色
    this.initDefaultCharacters();
  }
  
  /**
   * 初始化默认角色（玩家和GM）
   */
  initDefaultCharacters() {
    // 创建默认的玩家角色
    const playerCharacter = {
      id: 'player_default',
      name: '玩家角色',
      type: 'player',
      description: '由玩家控制的角色',
      gender: '未设置',
      age: 25,
      role: '冒险者',
      background: '请设置你的角色背景故事',
      personality: {
        openness: 70,
        conscientiousness: 60,
        extraversion: 65,
        agreeableness: 75,
        neuroticism: 40
      },
      skills: [
        { name: '战斗', level: 5 },
        { name: '交涉', level: 6 },
        { name: '探索', level: 7 }
      ],
      relationships: [],
      behaviorTags: ['brave', 'curious', 'resourceful'],
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 2000
      }
    };
    
    // 创建默认的GM角色
    const gmCharacter = {
      id: 'gm_default',
      name: '游戏主持人',
      type: 'gm',
      description: '负责推进故事、描述场景和执行规则的角色',
      gender: '未设置',
      age: 0,
      role: '游戏主持人',
      background: '世界的创造者和故事的讲述者',
      personality: {
        openness: 90,
        conscientiousness: 85,
        extraversion: 70,
        agreeableness: 80,
        neuroticism: 30
      },
      skills: [
        { name: '讲故事', level: 10 },
        { name: '规则判定', level: 10 },
        { name: '场景描述', level: 10 }
      ],
      relationships: [],
      behaviorTags: ['fair', 'creative', 'descriptive'],
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: '',
        temperature: 0.8,
        maxTokens: 3000
      }
    };
    
    // 注册默认角色
    try {
      this.register(playerCharacter);
      this.register(gmCharacter);
    } catch (error) {
      console.error('初始化默认角色失败:', error);
    }
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
   * 获取所有角色对象
   * @returns {Object} 所有角色的对象映射
   */
  getAllAgents() {
    const result = {};
    this.agents.forEach((agent, id) => {
      result[id] = agent;
    });
    return result;
  }
  
  /**
   * 切换有无玩家模式
   * @param {boolean} hasPlayer - 是否有玩家角色
   */
  setPlayerMode(hasPlayer) {
    this.hasPlayerCharacter = hasPlayer;
    
    // 如果切换到无玩家模式，确保有足够的NPC角色
    if (!hasPlayer) {
      const npcs = this.getAll().filter(agent => agent.type === 'npc');
      if (npcs.length === 0) {
        // 创建一个默认NPC
        const defaultNPC = {
          id: `npc_default_${Date.now()}`,
          name: '默认NPC',
          type: 'npc',
          description: '自动生成的NPC角色',
          gender: '未设置',
          age: 30,
          role: '居民',
          background: '普通的居民',
          personality: {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 50
          },
          skills: [
            { name: '日常生活', level: 5 }
          ],
          relationships: [],
          behaviorTags: ['normal'],
          llmConfig: {
            provider: 'openai',
            model: 'gpt-4o',
            apiKey: '',
            temperature: 0.7,
            maxTokens: 2000
          }
        };
        this.register(defaultNPC);
      }
    }
    
    return this.hasPlayerCharacter;
  }
  
  /**
   * 获取当前模式是否有玩家角色
   * @returns {boolean}
   */
  getPlayerMode() {
    return this.hasPlayerCharacter;
  }
  
  /**
   * 更新角色信息
   * @param {string} id - 角色ID
   * @param {Object} data - 更新的数据
   * @returns {AgentProfile|undefined} 更新后的角色
   */
  update(id, data) {
    if (!id || !this.agents.has(id)) {
      console.error(`更新失败: 角色ID ${id} 不存在`);
      return undefined;
    }
    
    try {
      // 确保skills是一个数组
      if (data.skills && !Array.isArray(data.skills)) {
        data.skills = [];
      }
      
      // 确保relationships是一个数组
      if (data.relationships && !Array.isArray(data.relationships)) {
        data.relationships = [];
      }
      
      const updatedAgent = {
        ...this.agents.get(id),
        ...data,
        id // 确保ID不变
      };
      
      this.agents.set(id, updatedAgent);
      return updatedAgent;
    } catch (error) {
      console.error(`更新角色失败:`, error);
      return undefined;
    }
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

