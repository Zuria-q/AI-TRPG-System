/**
 * 角色注册管理模块
 */
class AgentRegistry {
  constructor() {
    this.agents = {};
    this.templates = {};
  }

  /**
   * 注册一个角色
   * @param {Object} agent - 角色对象
   */
  register(agent) {
    if (!agent || !agent.id) {
      console.error('注册角色失败: 无效的角色对象', agent);
      return false;
    }
    
    this.agents[agent.id] = agent;
    return true;
  }

  /**
   * 创建一个角色
   * @param {Object} config - 角色配置
   * @returns {Object} 创建的角色
   */
  createAgent(config) {
    try {
      const agent = {
        id: config.id || `agent_${Date.now()}`,
        name: config.name || '未命名角色',
        type: config.type || 'npc',
        description: config.description || '',
        personality: config.personality || '',
        goals: config.goals || [],
        relationships: config.relationships || {},
        stats: config.stats || {},
        inventory: config.inventory || [],
        memory: [],
        created: Date.now(),
        lastUpdate: Date.now()
      };
      
      return agent;
    } catch (error) {
      console.error('创建角色失败:', error, '配置:', config);
      return null;
    }
  }

  /**
   * 获取所有角色
   * @returns {Object} 所有角色
   */
  getAllAgents() {
    return this.agents;
  }

  /**
   * 获取指定角色
   * @param {string} id - 角色ID
   * @returns {Object} 角色对象
   */
  getAgent(id) {
    return this.agents[id];
  }

  /**
   * 更新角色
   * @param {string} id - 角色ID
   * @param {Object} updates - 更新数据
   * @returns {Object} 更新后的角色
   */
  updateAgent(id, updates) {
    if (!this.agents[id]) {
      console.error('更新角色失败: 角色不存在', id);
      return null;
    }
    
    this.agents[id] = {
      ...this.agents[id],
      ...updates,
      lastUpdate: Date.now()
    };
    
    return this.agents[id];
  }

  /**
   * 删除角色
   * @param {string} id - 角色ID
   * @returns {boolean} 是否成功
   */
  removeAgent(id) {
    if (!this.agents[id]) {
      return false;
    }
    
    delete this.agents[id];
    return true;
  }

  /**
   * 注册角色模板
   * @param {string} name - 模板名称
   * @param {Object} template - 模板对象
   */
  registerTemplate(name, template) {
    this.templates[name] = template;
  }

  /**
   * 从模板创建角色
   * @param {string} templateName - 模板名称
   * @param {Object} overrides - 覆盖属性
   * @returns {Object} 创建的角色
   */
  createFromTemplate(templateName, overrides = {}) {
    const template = this.templates[templateName];
    if (!template) {
      console.error('从模板创建角色失败: 模板不存在', templateName);
      return null;
    }
    
    return this.createAgent({
      ...template,
      ...overrides
    });
  }
}

// 导出单例实例
const agentRegistry = new AgentRegistry();
export default agentRegistry;
