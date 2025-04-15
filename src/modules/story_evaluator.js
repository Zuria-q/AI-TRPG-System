/**
 * 故事评估模块
 * 负责评估游戏故事的质量、一致性和结局类型
 */
class StoryEvaluator {
  constructor() {
    // 评估指标配置
    this.metrics = {
      coherence: { weight: 0.2, description: '故事的连贯性和逻辑一致性' },
      engagement: { weight: 0.2, description: '故事的吸引力和趣味性' },
      character: { weight: 0.15, description: '角色发展的深度和可信度' },
      creativity: { weight: 0.15, description: '故事创意和独特元素' },
      pacing: { weight: 0.1, description: '故事节奏的控制' },
      theme: { weight: 0.1, description: '主题表达的清晰度和深度' },
      resolution: { weight: 0.1, description: '冲突解决的满意度' }
    };
    
    // 结局类型定义
    this.endingTypes = {
      perfect: { threshold: 0.9, description: '完美结局：所有主要冲突都得到圆满解决，主角实现了所有目标' },
      good: { threshold: 0.7, description: '好结局：大多数冲突得到解决，主角实现了主要目标' },
      neutral: { threshold: 0.5, description: '中性结局：部分冲突得到解决，主角实现了部分目标' },
      bad: { threshold: 0.3, description: '坏结局：大多数冲突未解决，主角未能实现主要目标' },
      tragic: { threshold: 0, description: '悲剧结局：几乎所有冲突都未解决，主角失败' }
    };
    
    // 评估历史
    this.evaluationHistory = [];
  }
  
  /**
   * 评估故事质量
   * @param {Object} story - 故事对象，包含对话、事件等
   * @returns {Object} 评估结果
   */
  evaluateStory(story) {
    try {
      if (!story) {
        throw new Error('故事对象不能为空');
      }
      
      // 初始化评分
      const scores = {};
      let totalScore = 0;
      let totalWeight = 0;
      
      // 计算每个指标的分数
      for (const [metric, config] of Object.entries(this.metrics)) {
        const score = this.calculateMetricScore(story, metric);
        scores[metric] = {
          score,
          weight: config.weight,
          weightedScore: score * config.weight,
          description: config.description
        };
        
        totalScore += score * config.weight;
        totalWeight += config.weight;
      }
      
      // 计算加权平均分
      const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      
      // 确定结局类型
      const endingType = this.determineEndingType(story, overallScore);
      
      // 生成评估报告
      const evaluation = {
        overallScore,
        scores,
        endingType,
        timestamp: Date.now(),
        storyId: story.id || `story_${Date.now()}`,
        recommendations: this.generateRecommendations(scores, endingType)
      };
      
      // 保存评估历史
      this.evaluationHistory.push({
        storyId: evaluation.storyId,
        overallScore: evaluation.overallScore,
        endingType: evaluation.endingType.type,
        timestamp: evaluation.timestamp
      });
      
      return evaluation;
    } catch (error) {
      console.error('评估故事失败:', error);
      return {
        error: error.message,
        overallScore: 0,
        scores: {},
        endingType: { type: 'unknown', description: '无法确定' },
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 计算特定指标的分数
   * @param {Object} story - 故事对象
   * @param {string} metric - 指标名称
   * @returns {number} 分数 (0-1)
   */
  calculateMetricScore(story, metric) {
    try {
      // 这里应该实现更复杂的评分逻辑
      // 当前使用简化版本，基于故事属性的存在性和完整性
      
      switch (metric) {
        case 'coherence':
          return this.evaluateCoherence(story);
        case 'engagement':
          return this.evaluateEngagement(story);
        case 'character':
          return this.evaluateCharacterDevelopment(story);
        case 'creativity':
          return this.evaluateCreativity(story);
        case 'pacing':
          return this.evaluatePacing(story);
        case 'theme':
          return this.evaluateTheme(story);
        case 'resolution':
          return this.evaluateResolution(story);
        default:
          return 0.5; // 默认中等分数
      }
    } catch (error) {
      console.error(`计算${metric}分数失败:`, error);
      return 0.5; // 出错时返回中等分数
    }
  }
  
  /**
   * 评估故事的连贯性
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  evaluateCoherence(story) {
    // 检查故事是否有清晰的开始、中间和结束
    const hasBeginning = story.events && story.events.some(e => e.type === 'beginning');
    const hasMiddle = story.events && story.events.some(e => e.type === 'middle');
    const hasEnding = story.events && story.events.some(e => e.type === 'ending');
    
    // 检查对话和事件的时间顺序
    const chronologicalOrder = this.checkChronologicalOrder(story);
    
    // 检查角色行为的一致性
    const characterConsistency = this.checkCharacterConsistency(story);
    
    // 计算加权分数
    return (
      (hasBeginning ? 0.2 : 0) +
      (hasMiddle ? 0.2 : 0) +
      (hasEnding ? 0.2 : 0) +
      (chronologicalOrder * 0.2) +
      (characterConsistency * 0.2)
    );
  }
  
  /**
   * 检查故事中的事件和对话是否按时间顺序排列
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  checkChronologicalOrder(story) {
    if (!story.events || story.events.length < 2) {
      return 0.5;
    }
    
    let orderViolations = 0;
    for (let i = 1; i < story.events.length; i++) {
      if (story.events[i].timestamp < story.events[i-1].timestamp) {
        orderViolations++;
      }
    }
    
    return Math.max(0, 1 - (orderViolations / (story.events.length - 1)));
  }
  
  /**
   * 检查角色行为的一致性
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  checkCharacterConsistency(story) {
    if (!story.characters || !story.dialogues) {
      return 0.5;
    }
    
    // 简化版：检查每个角色的对话风格是否一致
    const characterStyles = {};
    let inconsistencies = 0;
    let totalChecks = 0;
    
    story.dialogues.forEach(dialogue => {
      if (!dialogue.character || !dialogue.content) return;
      
      const characterId = dialogue.character;
      const content = dialogue.content.toLowerCase();
      
      // 提取简单的语言风格特征
      const features = {
        avgWordLength: this.calculateAvgWordLength(content),
        questionFrequency: (content.match(/\?/g) || []).length / content.length,
        exclamationFrequency: (content.match(/!/g) || []).length / content.length
      };
      
      if (!characterStyles[characterId]) {
        characterStyles[characterId] = features;
      } else {
        // 检查风格差异
        const existingFeatures = characterStyles[characterId];
        const wordLengthDiff = Math.abs(existingFeatures.avgWordLength - features.avgWordLength);
        const questionDiff = Math.abs(existingFeatures.questionFrequency - features.questionFrequency);
        const exclamationDiff = Math.abs(existingFeatures.exclamationFrequency - features.exclamationFrequency);
        
        // 如果差异过大，计为不一致
        if (wordLengthDiff > 1 || questionDiff > 0.1 || exclamationDiff > 0.1) {
          inconsistencies++;
        }
        
        totalChecks++;
      }
    });
    
    return totalChecks > 0 ? Math.max(0, 1 - (inconsistencies / totalChecks)) : 0.5;
  }
  
  /**
   * 计算文本的平均词长
   * @param {string} text - 文本
   * @returns {number} 平均词长
   */
  calculateAvgWordLength(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 0;
    
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    return totalLength / words.length;
  }
  
  /**
   * 评估故事的吸引力
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  evaluateEngagement(story) {
    // 简化版：基于对话数量、事件多样性和冲突存在性
    
    // 检查对话数量
    const dialogueCount = story.dialogues ? story.dialogues.length : 0;
    const dialogueScore = Math.min(1, dialogueCount / 20); // 假设20个对话是理想的
    
    // 检查事件多样性
    const eventTypes = new Set();
    if (story.events) {
      story.events.forEach(event => {
        if (event.type) eventTypes.add(event.type);
      });
    }
    const eventDiversityScore = Math.min(1, eventTypes.size / 5); // 假设5种不同类型是理想的
    
    // 检查冲突存在性
    const hasConflict = story.events && story.events.some(e => e.type === 'conflict');
    const conflictScore = hasConflict ? 1 : 0;
    
    // 计算加权分数
    return (
      dialogueScore * 0.4 +
      eventDiversityScore * 0.3 +
      conflictScore * 0.3
    );
  }
  
  /**
   * 评估角色发展
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  evaluateCharacterDevelopment(story) {
    if (!story.characters) {
      return 0.3; // 没有角色信息，给予较低分数
    }
    
    // 检查角色数量
    const characterCount = Object.keys(story.characters).length;
    const characterCountScore = Math.min(1, characterCount / 5); // 假设5个角色是理想的
    
    // 检查角色描述完整性
    let descriptionCompleteness = 0;
    let characterWithArcs = 0;
    
    Object.values(story.characters).forEach(character => {
      // 检查角色是否有完整描述
      if (character.description && character.personality && character.background) {
        descriptionCompleteness++;
      }
      
      // 检查角色是否有成长弧线
      if (character.arc || (character.initialState && character.finalState)) {
        characterWithArcs++;
      }
    });
    
    const descriptionScore = characterCount > 0 ? descriptionCompleteness / characterCount : 0;
    const arcScore = characterCount > 0 ? characterWithArcs / characterCount : 0;
    
    // 计算加权分数
    return (
      characterCountScore * 0.2 +
      descriptionScore * 0.4 +
      arcScore * 0.4
    );
  }
  
  /**
   * 评估故事创意
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  evaluateCreativity(story) {
    // 简化版：基于独特元素和意外转折
    
    // 检查独特元素
    const uniqueElements = story.uniqueElements || [];
    const uniqueElementsScore = Math.min(1, uniqueElements.length / 3); // 假设3个独特元素是理想的
    
    // 检查意外转折
    const twists = story.events ? story.events.filter(e => e.type === 'twist') : [];
    const twistsScore = Math.min(1, twists.length / 2); // 假设2个转折是理想的
    
    // 检查世界构建
    const worldBuildingScore = story.world && story.world.description ? 0.8 : 0.2;
    
    // 计算加权分数
    return (
      uniqueElementsScore * 0.4 +
      twistsScore * 0.4 +
      worldBuildingScore * 0.2
    );
  }
  
  /**
   * 评估故事节奏
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  evaluatePacing(story) {
    if (!story.events || story.events.length < 3) {
      return 0.4; // 事件太少，无法评估节奏
    }
    
    // 计算事件间的时间间隔
    const intervals = [];
    for (let i = 1; i < story.events.length; i++) {
      if (story.events[i].timestamp && story.events[i-1].timestamp) {
        intervals.push(story.events[i].timestamp - story.events[i-1].timestamp);
      }
    }
    
    if (intervals.length === 0) {
      return 0.5; // 无法计算间隔
    }
    
    // 计算间隔的标准差，用于评估节奏的变化
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // 标准差过大或过小都不理想
    // 理想的标准差应该是平均间隔的一定比例
    const idealStdDev = avgInterval * 0.5; // 假设理想标准差是平均间隔的50%
    const pacingScore = 1 - Math.min(1, Math.abs(stdDev - idealStdDev) / avgInterval);
    
    return pacingScore;
  }
  
  /**
   * 评估主题表达
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  evaluateTheme(story) {
    // 检查是否有明确的主题
    if (!story.theme) {
      return 0.3; // 没有明确主题，给予较低分数
    }
    
    // 检查主题在事件和对话中的体现
    let themeReferences = 0;
    
    // 在对话中检查主题关键词
    if (story.dialogues) {
      const themeKeywords = story.theme.keywords || [story.theme.name];
      
      story.dialogues.forEach(dialogue => {
        if (dialogue.content) {
          const content = dialogue.content.toLowerCase();
          themeKeywords.forEach(keyword => {
            if (content.includes(keyword.toLowerCase())) {
              themeReferences++;
            }
          });
        }
      });
    }
    
    // 在事件中检查主题关联
    if (story.events) {
      story.events.forEach(event => {
        if (event.themeRelevance) {
          themeReferences++;
        }
      });
    }
    
    // 计算主题引用分数
    const referenceScore = Math.min(1, themeReferences / 5); // 假设5次引用是理想的
    
    // 检查主题描述的深度
    const themeDepthScore = story.theme.description ? 
      Math.min(1, story.theme.description.length / 100) : 0.2; // 假设100字符是理想的
    
    // 计算加权分数
    return (
      0.4 + // 有明确主题的基础分
      referenceScore * 0.4 +
      themeDepthScore * 0.2
    );
  }
  
  /**
   * 评估冲突解决
   * @param {Object} story - 故事对象
   * @returns {number} 分数 (0-1)
   */
  evaluateResolution(story) {
    if (!story.conflicts || !story.events) {
      return 0.3; // 没有明确的冲突或事件
    }
    
    // 计算已解决的冲突比例
    const resolvedConflicts = story.conflicts.filter(conflict => conflict.resolved);
    const resolutionRatio = story.conflicts.length > 0 ? 
      resolvedConflicts.length / story.conflicts.length : 0;
    
    // 检查是否有明确的结局事件
    const hasEnding = story.events.some(event => event.type === 'ending');
    
    // 检查主角目标是否实现
    let goalAchievement = 0.5; // 默认中等
    if (story.protagonist && story.protagonist.goals) {
      const achievedGoals = story.protagonist.goals.filter(goal => goal.achieved);
      goalAchievement = story.protagonist.goals.length > 0 ?
        achievedGoals.length / story.protagonist.goals.length : 0.5;
    }
    
    // 计算加权分数
    return (
      resolutionRatio * 0.5 +
      (hasEnding ? 0.2 : 0) +
      goalAchievement * 0.3
    );
  }
  
  /**
   * 确定故事的结局类型
   * @param {Object} story - 故事对象
   * @param {number} overallScore - 总体评分
   * @returns {Object} 结局类型对象
   */
  determineEndingType(story, overallScore) {
    // 首先基于总体评分确定基础结局类型
    let baseType = 'neutral';
    for (const [type, config] of Object.entries(this.endingTypes)) {
      if (overallScore >= config.threshold) {
        baseType = type;
        break;
      }
    }
    
    // 然后考虑故事特定因素进行调整
    let adjustedType = baseType;
    
    // 检查主角是否存活
    if (story.protagonist && story.protagonist.status === 'deceased') {
      // 如果主角死亡，结局不可能是完美或好
      if (adjustedType === 'perfect' || adjustedType === 'good') {
        adjustedType = 'neutral';
      }
      
      // 如果有牺牲主题，可能是悲壮结局
      if (story.theme && story.theme.name === 'sacrifice') {
        adjustedType = 'bittersweet';
      } else {
        // 否则可能是悲剧结局
        adjustedType = 'tragic';
      }
    }
    
    // 检查主要目标是否实现
    if (story.protagonist && story.protagonist.goals) {
      const mainGoals = story.protagonist.goals.filter(goal => goal.importance >= 0.7);
      const achievedMainGoals = mainGoals.filter(goal => goal.achieved);
      
      if (mainGoals.length > 0) {
        const mainGoalRatio = achievedMainGoals.length / mainGoals.length;
        
        // 如果所有主要目标都实现，结局至少是好的
        if (mainGoalRatio === 1 && adjustedType === 'neutral') {
          adjustedType = 'good';
        }
        
        // 如果没有主要目标实现，结局不可能是好的
        if (mainGoalRatio === 0 && (adjustedType === 'good' || adjustedType === 'perfect')) {
          adjustedType = 'neutral';
        }
      }
    }
    
    // 返回结局类型对象
    return {
      type: adjustedType,
      description: this.endingTypes[adjustedType]?.description || '未定义的结局类型',
      score: overallScore
    };
  }
  
  /**
   * 生成改进建议
   * @param {Object} scores - 各项评分
   * @param {Object} endingType - 结局类型
   * @returns {Array} 建议列表
   */
  generateRecommendations(scores, endingType) {
    const recommendations = [];
    
    // 找出得分最低的两个指标
    const sortedMetrics = Object.entries(scores)
      .sort(([, a], [, b]) => a.score - b.score)
      .slice(0, 2);
    
    // 为每个低分指标生成建议
    sortedMetrics.forEach(([metric, data]) => {
      if (data.score < 0.6) {
        switch (metric) {
          case 'coherence':
            recommendations.push('提高故事的连贯性，确保事件之间有清晰的因果关系。');
            break;
          case 'engagement':
            recommendations.push('增加更多引人入胜的对话和情节转折，提高读者参与度。');
            break;
          case 'character':
            recommendations.push('深化角色发展，为主要角色添加更丰富的背景和成长弧线。');
            break;
          case 'creativity':
            recommendations.push('引入更多独特元素和意外转折，避免情节过于可预测。');
            break;
          case 'pacing':
            recommendations.push('调整故事节奏，确保高潮和平静部分的适当分布。');
            break;
          case 'theme':
            recommendations.push('强化主题表达，确保主题贯穿整个故事并在关键时刻得到体现。');
            break;
          case 'resolution':
            recommendations.push('改进冲突解决方式，确保主要冲突得到满意的解决。');
            break;
        }
      }
    });
    
    // 基于结局类型添加建议
    if (endingType.type === 'tragic' || endingType.type === 'bad') {
      recommendations.push('考虑为主角提供更多实现目标的机会，或者强化悲剧结局的情感冲击。');
    } else if (endingType.type === 'neutral') {
      recommendations.push('明确故事的主要冲突，并为其提供更明确的解决方案。');
    }
    
    return recommendations;
  }
  
  /**
   * 获取评估历史
   * @param {number} limit - 限制返回数量
   * @returns {Array} 评估历史记录
   */
  getEvaluationHistory(limit = 10) {
    return this.evaluationHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  /**
   * 清除评估历史
   */
  clearEvaluationHistory() {
    this.evaluationHistory = [];
  }
}

// 导出单例实例
const storyEvaluator = new StoryEvaluator();
export default storyEvaluator;
