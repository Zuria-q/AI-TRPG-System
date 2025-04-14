import { useState, useEffect } from 'react';
import agentRegistry from './agent_registry';
import trustMap from './trust_map';

export default function CharacterEditor({ agentId }) {
  const [agent, setAgent] = useState(null);
  const [relationships, setRelationships] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  
  // 加载角色数据
  useEffect(() => {
    if (agentId) {
      const agentData = agentRegistry.get(agentId);
      setAgent({ ...agentData });
      
      // 加载关系数据
      const rels = {};
      agentRegistry.getAll().forEach(otherAgent => {
        if (otherAgent.id !== agentId) {
          rels[otherAgent.id] = trustMap.getTrustLevel(agentId, otherAgent.id);
        }
      });
      setRelationships(rels);
    }
  }, [agentId]);

  // 保存角色数据
  const handleSave = () => {
    agentRegistry.update(agentId, agent);
    
    // 更新关系
    Object.entries(relationships).forEach(([otherId, trustLevel]) => {
      trustMap.setTrustLevel(agentId, otherId, trustLevel);
    });
    
    setIsEditing(false);
  };

  // 添加新技能
  const handleAddSkill = () => {
    setAgent(prev => ({
      ...prev,
      skills: [...prev.skills, { name: '新技能', level: 1 }]
    }));
  };

  // 更新技能
  const handleSkillChange = (index, field, value) => {
    setAgent(prev => {
      const newSkills = [...prev.skills];
      newSkills[index][field] = field === 'level' ? parseInt(value) : value;
      return { ...prev, skills: newSkills };
    });
  };

  if (!agent) return <div className="p-4 text-gray-400">请选择角色</div>;

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{agent.name} 的角色卡</h2>
        {isEditing ? (
          <div className="space-x-2">
            <button 
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 rounded"
            >
              保存
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-600 rounded"
            >
              取消
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            编辑
          </button>
        )}
      </div>
      
      {/* 基础信息 */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2 border-b border-gray-700 pb-1">基础信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">角色名</label>
            {isEditing ? (
              <input
                type="text"
                value={agent.name}
                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                className="w-full p-2 bg-gray-700 rounded"
              />
            ) : (
              <p className="p-2 bg-gray-900 rounded">{agent.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">身份</label>
            {isEditing ? (
              <input
                type="text"
                value={agent.role}
                onChange={(e) => setAgent({ ...agent, role: e.target.value })}
                className="w-full p-2 bg-gray-700 rounded"
              />
            ) : (
              <p className="p-2 bg-gray-900 rounded">{agent.role}</p>
            )}
          </div>
          
          <div className="col-span-2">
            <label className="block text-gray-400 text-sm mb-1">性格描述</label>
            {isEditing ? (
              <textarea
                value={agent.personality}
                onChange={(e) => setAgent({ ...agent, personality: e.target.value })}
                className="w-full p-2 bg-gray-700 rounded h-20"
              />
            ) : (
              <p className="p-2 bg-gray-900 rounded min-h-20">{agent.personality}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* 技能列表 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold border-b border-gray-700 pb-1">技能</h3>
          {isEditing && (
            <button 
              onClick={handleAddSkill}
              className="px-2 py-1 bg-blue-600 rounded text-sm"
            >
              添加技能
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {agent.skills?.length > 0 ? (
            agent.skills.map((skill, index) => (
              <div key={index} className="flex items-center p-2 bg-gray-700 rounded">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                      className="flex-1 p-1 bg-gray-800 rounded mr-2"
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={skill.level}
                      onChange={(e) => handleSkillChange(index, 'level', e.target.value)}
                      className="w-16 p-1 bg-gray-800 rounded"
                    />
                  </>
                ) : (
                  <>
                    <span className="flex-1">{skill.name}</span>
                    <span className="text-yellow-400">{'★'.repeat(skill.level)}</span>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">暂无技能</p>
          )}
        </div>
      </div>
      
      {/* 关系网络 */}
      <div>
        <h3 className="font-semibold mb-2 border-b border-gray-700 pb-1">人际关系</h3>
        <div className="space-y-3">
          {Object.entries(relationships).map(([otherId, trustLevel]) => {
            const otherAgent = agentRegistry.get(otherId);
            return (
              <div key={otherId} className="flex items-center p-2 bg-gray-700 rounded">
                <span className="flex-1">{otherAgent.name}</span>
                {isEditing ? (
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={trustLevel}
                    onChange={(e) => setRelationships({
                      ...relationships,
                      [otherId]: parseInt(e.target.value)
                    })}
                    className="w-32"
                  />
                ) : null}
                <span className={`ml-2 w-20 text-right ${trustLevel > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trustLevel > 0 ? `信任(+${trustLevel})` : `敌视(${trustLevel})`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
