/**
 * 游戏状态管理模块
 * 定义核心状态结构和初始化逻辑
 */

/** 
 * 环境状态
 * @typedef {Object} EnvironmentState
 * @property {string} locationId - 当前场景ID
 * @property {string} time - 游戏内时间
 * @property {string} description - 场景描述
 * @property {Array<string>} exits - 可用出口
 */

/**
 * 角色状态
 * @typedef {Object} CharacterState
 * @property {string} id - 角色唯一标识
 * @property {string} name - 显示名称
 * @property {number} health - 健康值 (0-100)
 * @property {number} mood - 情绪值 (-100到100)
 * @property {string} location - 所在位置ID
 * @property {Array<string>} inventory - 携带物品ID列表
 * @property {string} status - 当前状态 (NORMAL/INJURED/UNCONSCIOUS)
 * @property {Array<string>} tags - 角色标签列表
 */

/**
 * 物品状态
 * @typedef {Object} ItemState
 * @property {string} id - 物品唯一标识
 * @property {string} name - 显示名称
 * @property {string} description - 物品描述
 * @property {string} location - 所在位置ID (角色ID或场景ID)
 * @property {boolean} usable - 是否可使用
 * @property {Array<string>} tags - 物品标签列表
 */

/**
 * 地点信息
 * @typedef {Object} Location
 * @property {string} id - 地点唯一ID
 * @property {string} name - 显示名称
 * @property {string} description - 地点描述
 */

/**
 * 完整游戏状态
 * @typedef {Object} GameState
 * @property {EnvironmentState} environment - 环境状态
 * @property {Array<CharacterState>} characters - 角色状态列表
 * @property {Array<ItemState>} items - 物品状态列表
 * @property {Array<Location>} locations - 所有已知地点
 * @property {string} playerId - 玩家角色ID
 * @property {number} turn - 当前回合数
 */

/**
 * 初始化基础游戏状态
 * @param {Object} config
 * @param {Array<Object>} config.characters - 初始角色配置
 * @param {Array<Object>} config.items - 初始物品配置
 * @param {Object} config.environment - 初始环境配置
 * @returns {GameState} 初始化后的游戏状态
 */
export function initializeState({ characters = [], items = [], environment = {} }) {
  // 初始化角色状态
  const characterStates = characters.map(char => ({
    id: char.id,
    name: char.name,
    health: char.health ?? 100,
    mood: char.mood ?? 0,
    location: char.location ?? environment.locationId,
    inventory: char.inventory ?? [],
    status: char.status ?? 'NORMAL',
    tags: char.tags ?? []
  }));

  // 初始化物品状态
  const itemStates = items.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    location: item.location ?? environment.locationId,
    usable: item.usable ?? false,
    tags: item.tags ?? []
  }));

  // 初始化地点信息
  const locations = [{
    id: environment.locationId ?? 'room_1',
    name: environment.name ?? '主房间',
    description: environment.description ?? '一个普通的房间'
  }];

  // 组合完整状态
  return {
    environment: {
      locationId: environment.locationId ?? 'room_1',
      time: '08:00',
      description: environment.description ?? '一个普通的房间',
      exits: environment.exits ?? []
    },
    characters: characterStates,
    items: itemStates,
    locations,
    playerId: characters[0]?.id ?? '',
    turn: 0
  };
}

/**
 * 验证游戏状态是否有效
 * @param {GameState} state 
 * @returns {boolean}
 */
export function validateState(state) {
  if (!state || !state.environment || !state.characters || !state.items) {
    return false;
  }
  
  // 检查角色位置有效性
  const validLocations = [
    state.environment.locationId,
    ...state.environment.exits,
    ...state.locations.map(loc => loc.id)
  ];
  
  return state.characters.every(char => 
    validLocations.includes(char.location) ||
    state.characters.some(c => c.id === char.location)
  );
}

export default {
  initializeState,
  validateState
};
