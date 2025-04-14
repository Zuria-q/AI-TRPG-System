/**
 * 定义玩家可执行的行为类型和结构
 * 每个行为包含类型(type)、内容(content)和目标(target)
 * 不同类型的附加字段不同
 */

export const ActionTypes = {
  DIALOGUE: 'DIALOGUE',   // 对话行为
  ACTION: 'ACTION',       // 自由行动
  ITEM: 'ITEM'           // 物品操作
};

/**
 * 对话意图标签
 */
export const DialogueIntents = {
  QUESTION: 'QUESTION',   // 提问
  STATEMENT: 'STATEMENT', // 陈述
  COMMAND: 'COMMAND',     // 命令
  PERSUADE: 'PERSUADE',   // 说服
  THREATEN: 'THREATEN',   // 威胁
  FLIRT: 'FLIRT'         // 调情
};

/**
 * 基础行为结构
 * @typedef {Object} BaseAction
 * @property {string} type - 行为类型 (ActionTypes)
 * @property {string} content - 行为内容
 * @property {string} target - 目标角色ID
 */

/**
 * 对话行为
 * @typedef {Object} DialogueAction
 * @property {string} type - 固定为 ActionTypes.DIALOGUE
 * @property {string} content - 对话内容
 * @property {string} target - 目标角色ID
 * @property {string} intent - 对话意图 (DialogueIntents)
 * @property {number} intensity - 语气强度 (0-1)
 */

/**
 * 自由行动
 * @typedef {Object} ActionAction
 * @property {string} type - 固定为 ActionTypes.ACTION
 * @property {string} content - 行动描述
 * @property {string} target - 目标角色/物品ID (可选)
 * @property {string} location - 行动发生位置
 */

/**
 * 物品操作
 * @typedef {Object} ItemAction
 * @property {string} type - 固定为 ActionTypes.ITEM
 * @property {string} content - 物品ID
 * @property {string} target - 目标角色ID (可选)
 * @property {string} verb - 操作动词 (使用/给予/丢弃等)
 */

/**
 * 玩家行为联合类型
 * @typedef {DialogueAction|ActionAction|ItemAction} PlayerAction
 */

/**
 * 根据文本内容判断最可能的对话意图
 * @param {string} text - 玩家输入的对话内容
 * @returns {string} DialogueIntents 中最匹配的意图标签
 * 
 * 判断规则说明：
 * - QUESTION: 包含疑问词(吗/呢/什么/为什么)或问号
 * - COMMAND: 包含命令式动词(给/拿/过来/停止)或感叹号
 * - THREATEN: 包含威胁性词汇(不然/否则/你会后悔)
 * - PERSUADE: 包含劝说性词汇(建议/最好/可以/考虑)
 * - FLIRT: 包含亲密称呼或暧昧词汇(亲爱的/喜欢/漂亮)
 * - STATEMENT: 默认回退为陈述
 */
export function classifyIntent(text) {
  if (!text || typeof text !== 'string') return DialogueIntents.STATEMENT;
  
  const t = text.trim();
  
  // 问题检测
  if (/[吗呢么何怎为什么]|\？$|\?$/.test(t)) {
    return DialogueIntents.QUESTION;
  }
  
  // 命令检测
  if (/^(给|拿|过来|停止|快|别|不要)|！$|!$/.test(t)) {
    return DialogueIntents.COMMAND;
  }
  
  // 威胁检测
  if (/不然|否则|你会后悔|小心|等着瞧/.test(t)) {
    return DialogueIntents.THREATEN;
  }
  
  // 劝说检测
  if (/建议|最好|可以|考虑|我们(一起|合作)/.test(t)) {
    return DialogueIntents.PERSUADE;
  }
  
  // 调情检测
  if (/亲爱的|喜欢|爱你|漂亮|帅气|约会/.test(t)) {
    return DialogueIntents.FLIRT;
  }
  
  // 默认返回陈述
  return DialogueIntents.STATEMENT;
}

export default {
  ActionTypes,
  DialogueIntents,
  classifyIntent
};
