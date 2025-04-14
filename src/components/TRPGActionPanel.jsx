import React, { useState } from 'react';
import { ActionTypes, DialogueIntents, classifyIntent } from './action_space';

/**
 * 玩家行为输入面板
 * @param {Object} props
 * @param {Array} props.characters - 可选目标角色列表 [{id, name}]
 * @param {Array} props.items - 可选物品列表 [{id, name}]
 * @param {Function} props.onSubmit - 行为提交回调 (action) => void
 */
export default function TRPGActionPanel({ characters = [], items = [], onSubmit }) {
  const [actionType, setActionType] = useState(ActionTypes.DIALOGUE);
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('');
  const [intent, setIntent] = useState(DialogueIntents.STATEMENT);
  
  // 处理内容变化时自动检测意图
  const handleContentChange = (e) => {
    const text = e.target.value;
    setContent(text);
    if (actionType === ActionTypes.DIALOGUE) {
      setIntent(classifyIntent(text));
    }
  };

  // 提交行为
  const handleSubmit = () => {
    const baseAction = { type: actionType, content, target };
    
    // 根据不同类型添加额外字段
    let action;
    switch (actionType) {
      case ActionTypes.DIALOGUE:
        action = { ...baseAction, intent, intensity: 0.5 };
        break;
      case ActionTypes.ACTION:
        action = { ...baseAction, location: 'current' };
        break;
      case ActionTypes.ITEM:
        action = { ...baseAction, verb: 'use' };
        break;
      default:
        return;
    }
    
    onSubmit(action);
    setContent('');
  };

  // 可选项根据行为类型变化
  const targetOptions = actionType === ActionTypes.ITEM ? items : characters;
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3">行为输入</h3>
      
      {/* 行为类型选择 */}
      <div className="flex space-x-2 mb-3">
        {Object.values(ActionTypes).map((type) => (
          <button
            key={type}
            className={`px-3 py-1 rounded ${actionType === type 
              ? 'bg-blue-500 text-white' 
              : 'bg-white border border-gray-300'}`}
            onClick={() => setActionType(type)}
          >
            {type === ActionTypes.DIALOGUE ? '对话' : 
             type === ActionTypes.ACTION ? '行动' : '物品'}
          </button>
        ))}
      </div>
      
      {/* 内容输入 */}
      <textarea
        className="w-full p-2 border border-gray-300 rounded mb-3"
        placeholder={actionType === ActionTypes.DIALOGUE 
          ? '输入对话内容...' 
          : actionType === ActionTypes.ACTION 
            ? '描述你的行动...' 
            : '选择物品...'}
        value={content}
        onChange={handleContentChange}
      />
      
      {/* 意图显示（仅对话） */}
      {actionType === ActionTypes.DIALOGUE && (
        <div className="mb-3">
          <span className="text-sm text-gray-600">检测意图: </span>
          <span className="font-medium">{intent}</span>
        </div>
      )}
      
      {/* 目标选择 */}
      {targetOptions.length > 0 && (
        <select 
          className="w-full p-2 border border-gray-300 rounded mb-3"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">选择目标...</option>
          {targetOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      )}
      
      {/* 提交按钮 */}
      <button
        className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600"
        onClick={handleSubmit}
        disabled={!content}
      >
        执行行为
      </button>
    </div>
  );
}
