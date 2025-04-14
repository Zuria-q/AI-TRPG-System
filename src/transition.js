import { ActionTypes } from './action_space';
import { validateState } from './game_state';

/**
 * 根据当前状态和行为计算新状态
 * @param {Object} params
 * @param {Object} params.currentState - 当前游戏状态
 * @param {Object} params.action - 玩家行为
 * @returns {Object} 新游戏状态
 */
export function computeNextState({ currentState, action }) {
  if (!validateState(currentState)) {
    throw new Error('Invalid current state');
  }
  
  // 创建状态副本
  const newState = JSON.parse(JSON.stringify(currentState));
  
  // 通用状态更新
  newState.turn += 1;
  
  // 根据行为类型处理
  switch (action.type) {
    case ActionTypes.DIALOGUE:
      handleDialogue(newState, action);
      break;
    case ActionTypes.ACTION:
      handleAction(newState, action);
      break;
    case ActionTypes.ITEM:
      handleItem(newState, action);
      break;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
  
  // 验证并返回新状态
  if (!validateState(newState)) {
    throw new Error('Transition resulted in invalid state');
  }
  
  return newState;
}

/**
 * 处理对话行为
 * @param {Object} state - 游戏状态（会被修改）
 * @param {Object} action - 对话行为
 */
function handleDialogue(state, action) {
  const targetChar = state.characters.find(c => c.id === action.target);
  const playerChar = state.characters.find(c => c.id === state.playerId);
  if (!targetChar || !playerChar) return;
  
  // 根据对话意图调整情绪
  switch (action.intent) {
    case 'THREATEN':
      targetChar.mood = Math.max(-100, targetChar.mood - 30);
      playerChar.mood = Math.max(-100, playerChar.mood - 10);
      break;
    case 'FLIRT':
      targetChar.mood = Math.min(100, targetChar.mood + 20);
      playerChar.mood = Math.min(100, playerChar.mood + 5);
      break;
    case 'PERSUADE':
      targetChar.mood = Math.min(100, targetChar.mood + 10);
      break;
    case 'QUESTION':
      targetChar.mood = Math.min(100, targetChar.mood + 5);
      break;
    case 'COMMAND':
      if (targetChar.tags.includes('obedient')) {
        targetChar.mood = Math.max(-100, targetChar.mood - 10);
      } else {
        targetChar.mood = Math.max(-100, targetChar.mood - 20);
      }
      break;
  }
  
  // 记录最后对话
  targetChar.lastTalk = {
    turn: state.turn,
    content: action.content,
    from: state.playerId
  };
}

/**
 * 处理自由行动
 * @param {Object} state - 游戏状态（会被修改）
 * @param {Object} action - 行动行为
 */
function handleAction(state, action) {
  const playerChar = state.characters.find(c => c.id === state.playerId);
  if (!playerChar) return;
  
  // 移动行为
  if (action.content.includes('移动到') && action.target) {
    const targetLocation = state.locations.find(l => l.id === action.target);
    if (targetLocation && state.environment.exits.includes(action.target)) {
      playerChar.location = action.target;
      
      // 更新当前环境
      if (playerChar.id === state.playerId) {
        state.environment.locationId = action.target;
        state.environment.description = targetLocation.description;
      }
    }
  }
  // 其他行动可以在这里扩展
}

/**
 * 处理物品操作
 * @param {Object} state - 游戏状态（会被修改）
 * @param {Object} action - 物品行为
 */
function handleItem(state, action) {
  const item = state.items.find(i => i.id === action.content);
  const playerChar = state.characters.find(c => c.id === state.playerId);
  if (!item || !playerChar) return;
  
  // 验证物品是否可用
  if (item.location !== playerChar.id && item.location !== playerChar.location) {
    return;
  }
  
  switch (action.verb) {
    case '使用':
      // 使用物品效果
      if (item.tags?.includes('healing')) {
        playerChar.health = Math.min(100, playerChar.health + 20);
        playerChar.mood = Math.min(100, playerChar.mood + 10);
      } else if (item.tags?.includes('weapon')) {
        const targetChar = state.characters.find(c => c.id === action.target);
        if (targetChar) {
          targetChar.health = Math.max(0, targetChar.health - 30);
          if (targetChar.health <= 0) {
            targetChar.status = 'UNCONSCIOUS';
          }
          playerChar.mood = Math.max(-100, playerChar.mood - 15);
        }
      }
      break;
    case '给予':
      // 转移物品所有权
      if (action.target) {
        item.location = action.target;
        
        // 影响情绪
        const targetChar = state.characters.find(c => c.id === action.target);
        if (targetChar) {
          targetChar.mood = Math.min(100, targetChar.mood + 15);
        }
      }
      break;
    case '丢弃':
      item.location = playerChar.location;
      break;
  }
}

export default {
  computeNextState
};
