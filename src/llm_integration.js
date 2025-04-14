import promptBuilder from './promptBuilder';

/**
 * LLM集成系统
 */
class LLMIntegration {
  constructor() {
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.apiKey = null;
    this.cache = new Map();
    this.maxRetries = 3;
    
    // 提示生成器映射表
    this.promptGenerators = {
      system: (ctx) => promptBuilder.buildSystemPrompt(),
      narrative: (ctx) => promptBuilder.buildNarrativePrompt(ctx.type),
      character: (ctx) => promptBuilder.buildCharacterPrompt(ctx.agentId),
      action: (ctx) => promptBuilder.buildActionPrompt(ctx.action)
    };
  }

  /**
   * 设置API密钥
   * @param {string} key - API密钥
   */
  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * 生成游戏响应
   * @param {string} promptType - 提示类型 (system/narrative/character/action)
   * @param {Object} [context={}] - 上下文数据
   * @param {Object} [options={}] - 配置选项
   * @param {number} [options.temperature=0.7] - 生成温度
   * @param {number} [options.max_tokens=256] - 最大token数
   * @param {string} [options.model='gpt-3.5-turbo'] - 模型名称
   * @param {boolean} [options.log=false] - 是否打印调试日志
   * @returns {Promise<string>} LLM生成的响应
   */
  async generateResponse(promptType, context = {}, options = {}) {
    if (!this.apiKey) {
      throw new Error('请先设置LLM API密钥');
    }

    const {
      temperature = 0.7,
      max_tokens = 256,
      model = 'gpt-3.5-turbo', 
      log = false
    } = options;

    // 获取提示生成器
    const generator = this.promptGenerators[promptType] || this.promptGenerators.system;
    const prompt = generator(context);

    // 生成稳定的缓存键
    const cacheKey = this._generateCacheKey(promptType, context);

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      if (log) console.log('[LLM Cache Hit]:', cacheKey);
      return this.cache.get(cacheKey);
    }

    // 调用LLM API
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const response = await this._callLLMApi({
          model,
          messages: [
            { role: 'system', content: '你是一个专业的TRPG游戏AI助手' },
            { role: 'user', content: prompt }
          ],
          temperature,
          max_tokens
        });

        // 调试日志
        if (log) {
          console.log('[LLM Request Prompt]:\n', prompt);
          console.log('[LLM Response]:\n', response);
        }

        // 缓存结果
        this.cache.set(cacheKey, response);
        return response;
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          throw new Error(`LLM请求失败: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  /**
   * 生成稳定的缓存键
   * @private
   * @param {string} promptType - 提示类型
   * @param {Object} context - 上下文数据
   * @returns {string} 缓存键
   */
  _generateCacheKey(promptType, context) {
    const stableKeyParts = [
      promptType,
      context.agentId || '',
      context.turn || '',
      context.summary || ''
    ];
    return stableKeyParts.join('|');
  }

  /**
   * 调用LLM API
   * @private
   * @param {Object} payload - 请求数据
   * @returns {Promise<string>} 生成的文本
   */
  async _callLLMApi(payload) {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'LLM请求失败');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || '';
  }
}

// 单例模式导出
const llmIntegration = new LLMIntegration();

export default llmIntegration;
