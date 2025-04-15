/**
 * 大语言模型集成模块 - 支持多种模型接口
 */
class LLMIntegration {
  constructor() {
    // 支持的模型提供商
    this.providers = {
      openai: {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        streamEndpoint: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
        apiKey: '',
        requestFormat: this.formatOpenAIRequest,
        responseFormat: this.formatOpenAIResponse
      },
      deepseek: {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        models: ['deepseek-chat', 'deepseek-coder'],
        apiKey: '',
        requestFormat: this.formatOpenAIRequest, // 兼容OpenAI格式
        responseFormat: this.formatOpenAIResponse
      },
      claude: {
        name: 'Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        apiKey: '',
        requestFormat: this.formatClaudeRequest,
        responseFormat: this.formatClaudeResponse
      },
      gemini: {
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        models: ['gemini-pro', 'gemini-pro-vision'],
        apiKey: '',
        requestFormat: this.formatGeminiRequest,
        responseFormat: this.formatGeminiResponse
      },
      localLLM: {
        name: '本地模型',
        endpoint: 'http://localhost:11434/api/generate',
        models: ['llama3', 'mistral', 'phi3'],
        apiKey: '',
        requestFormat: this.formatLocalLLMRequest,
        responseFormat: this.formatLocalLLMResponse
      }
    };
    
    // 当前活跃的提供商
    this.activeProvider = 'openai';
    
    // 基本配置
    this.config = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      streamResponse: false,
      retryCount: 3,
      retryDelay: 1000,
      timeout: 30000,
      debug: false
    };
    
    // 请求队列管理
    this.requestQueue = [];
    this.processingQueue = false;
    this.rateLimitDelay = 1000; // 请求间隔(毫秒)
    this.lastRequestTime = 0;
    
    // 错误处理和统计
    this.errorStats = {
      totalRequests: 0,
      failedRequests: 0,
      retrySuccess: 0,
      lastError: null,
      errorLog: []
    };
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    // 更新基本配置
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
      
      // 如果更新了提供商，需要更新模型列表
      if (newConfig.provider && this.providers[newConfig.provider]) {
        this.activeProvider = newConfig.provider;
        
        // 确保当前模型在新提供商的支持列表中
        const supportedModels = this.providers[this.activeProvider].models;
        if (!supportedModels.includes(this.config.model)) {
          this.config.model = supportedModels[0]; // 默认使用第一个支持的模型
        }
      }
      
      // 如果更新了API密钥
      if (newConfig.apiKey) {
        this.providers[this.activeProvider].apiKey = newConfig.apiKey;
      }
    }
    
    return this.config;
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return {
      ...this.config,
      provider: this.activeProvider,
      model: this.config.model,
      apiKey: this.providers[this.activeProvider].apiKey ? '******' : '',
      availableProviders: Object.keys(this.providers).map(key => ({
        id: key,
        name: this.providers[key].name
      })),
      availableModels: this.providers[this.activeProvider].models
    };
  }
  
  /**
   * 设置API密钥
   * @param {string} provider - 提供商ID
   * @param {string} apiKey - API密钥
   */
  setApiKey(provider, apiKey) {
    if (this.providers[provider]) {
      this.providers[provider].apiKey = apiKey;
      return true;
    }
    return false;
  }
  
  /**
   * 切换模型提供商
   * @param {string} provider - 提供商ID
   * @param {string} model - 模型名称
   * @returns {boolean} 是否切换成功
   */
  switchProvider(provider, model) {
    if (!this.providers[provider]) {
      console.error(`不支持的提供商: ${provider}`);
      return false;
    }
    
    this.activeProvider = provider;
    
    // 如果指定了模型且该模型被支持
    if (model && this.providers[provider].models.includes(model)) {
      this.config.model = model;
    } else {
      // 否则使用该提供商的第一个模型
      this.config.model = this.providers[provider].models[0];
    }
    
    return true;
  }

  /**
   * 发送请求到LLM
   * @param {string} prompt - 提示词
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async sendRequest(prompt, options = {}) {
    // 增加请求统计
    this.errorStats.totalRequests++;
    
    // 获取当前提供商
    const provider = this.providers[this.activeProvider];
    if (!provider) {
      throw new Error(`未知的提供商: ${this.activeProvider}`);
    }
    
    // 检查API密钥
    if (!provider.apiKey) {
      throw new Error(`${provider.name}的API密钥未设置`);
    }
    
    // 合并选项
    const mergedOptions = {
      ...this.config,
      ...options,
      model: options.model || this.config.model,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || this.config.maxTokens,
      systemPrompt: options.systemPrompt || '你是一个TRPG游戏助手',
      history: options.history || []
    };
    
    // 尝试发送请求，支持重试
    let lastError = null;
    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      try {
        // 格式化请求
        const formattedRequest = provider.requestFormat.call(
          this, 
          prompt, 
          mergedOptions
        );
        
        // 构建请求选项
        const fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formattedRequest)
        };
        
        // 添加授权头
        if (this.activeProvider === 'openai' || this.activeProvider === 'deepseek') {
          fetchOptions.headers['Authorization'] = `Bearer ${provider.apiKey}`;
        } else if (this.activeProvider === 'claude') {
          fetchOptions.headers['x-api-key'] = provider.apiKey;
          fetchOptions.headers['anthropic-version'] = '2023-06-01';
        } else if (this.activeProvider === 'gemini') {
          // Gemini使用URL参数传递API密钥
          const endpoint = `${provider.endpoint}?key=${provider.apiKey}`;
          provider.endpoint = endpoint;
        }
        
        // 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        fetchOptions.signal = controller.signal;
        
        // 发送请求
        const response = await fetch(provider.endpoint, fetchOptions);
        clearTimeout(timeoutId);
        
        // 检查响应
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          
          // 记录错误
          const error = new Error(`API请求失败: ${response.status} ${response.statusText}`);
          error.status = response.status;
          error.data = errorData;
          throw error;
        }
        
        // 解析响应
        const data = await response.json();
        const result = provider.responseFormat.call(this, data);
        
        // 如果是重试成功，记录统计
        if (attempt > 0) {
          this.errorStats.retrySuccess++;
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // 记录错误
        if (this.config.debug) {
          console.error(`LLM请求错误(尝试 ${attempt+1}/${this.config.retryCount+1}):`, error);
        }
        
        // 如果已经是最后一次尝试，不再等待
        if (attempt === this.config.retryCount) {
          break;
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
      }
    }
    
    // 所有尝试都失败
    this.errorStats.failedRequests++;
    this.errorStats.lastError = lastError;
    this.errorStats.errorLog.push({
      timestamp: new Date().toISOString(),
      provider: this.activeProvider,
      model: this.config.model,
      error: lastError?.message || '未知错误',
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
    });
    
    // 保持错误日志在合理大小
    if (this.errorStats.errorLog.length > 50) {
      this.errorStats.errorLog = this.errorStats.errorLog.slice(-50);
    }
    
    throw lastError || new Error('LLM请求失败，所有重试均未成功');
  }

  /**
   * 将请求添加到队列
   * @param {string} prompt - 提示词
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async queueRequest(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        prompt,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        priority: options.priority || 0  // 支持优先级
      });

      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * 处理请求队列
   */
  async processQueue() {
    if (this.requestQueue.length === 0) {
      this.processingQueue = false;
      return;
    }

    this.processingQueue = true;
    
    // 按优先级排序队列
    this.requestQueue.sort((a, b) => {
      // 首先按优先级排序
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // 高优先级先处理
      }
      // 其次按时间戳排序
      return a.timestamp - b.timestamp; // 先进先出
    });
    
    const request = this.requestQueue.shift();

    // 实现请求速率限制
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }

    try {
      const result = await this.sendRequest(request.prompt, request.options);
      this.lastRequestTime = Date.now();
      request.resolve(result);
    } catch (error) {
      // 检查是否需要重新入队
      if (request.options.requeueOnFailure && request.retryCount < (request.options.maxRetries || 3)) {
        request.retryCount = (request.retryCount || 0) + 1;
        request.timestamp = Date.now(); // 更新时间戳
        request.priority = Math.max(-1, request.priority - 1); // 降低优先级
        this.requestQueue.push(request);
        console.warn(`请求重新入队，重试次数: ${request.retryCount}`);
      } else {
        request.reject(error);
      }
    }

    // 处理下一个请求
    setTimeout(() => this.processQueue(), 10);
  }

  /**
   * 格式化OpenAI请求
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   * @returns {Object} 格式化的请求
   */
  formatOpenAIRequest(prompt, options) {
    const messages = [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: prompt }
    ];
    
    // 插入历史消息
    if (options.history && Array.isArray(options.history) && options.history.length > 0) {
      // 将历史消息插入到system和user之间
      messages.splice(1, 0, ...options.history);
    }
    
    return {
      model: options.model,
      messages: messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0,
      stream: options.streamResponse || false
    };
  }
  
  /**
   * 格式化OpenAI响应
   * @param {Object} response - API响应
   * @returns {string} 格式化的响应
   */
  formatOpenAIResponse(response) {
    try {
      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('无效的OpenAI响应格式');
      }
      
      if (response.choices[0].message && response.choices[0].message.content) {
        return response.choices[0].message.content.trim();
      }
      
      return response.choices[0].text || '';
    } catch (error) {
      console.error('解析OpenAI响应失败:', error);
      throw error;
    }
  }
  
  /**
   * 格式化Claude请求
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   * @returns {Object} 格式化的请求
   */
  formatClaudeRequest(prompt, options) {
    const messages = [];
    
    // 添加系统提示
    messages.push({
      role: 'system',
      content: options.systemPrompt
    });
    
    // 添加历史消息
    if (options.history && Array.isArray(options.history)) {
      options.history.forEach(msg => {
        messages.push({
          role: msg.role === 'system' ? 'assistant' : msg.role,
          content: msg.content
        });
      });
    }
    
    // 添加当前提示
    messages.push({
      role: 'user',
      content: prompt
    });
    
    return {
      model: options.model,
      messages: messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: options.streamResponse || false
    };
  }
  
  /**
   * 格式化Claude响应
   * @param {Object} response - API响应
   * @returns {string} 格式化的响应
   */
  formatClaudeResponse(response) {
    try {
      if (!response || !response.content || !response.content[0]) {
        throw new Error('无效的Claude响应格式');
      }
      
      return response.content[0].text || '';
    } catch (error) {
      console.error('解析Claude响应失败:', error);
      throw error;
    }
  }
  
  /**
   * 生成角色对话
   * @param {Object} character - 角色信息
   * @param {string} prompt - 对话提示
   * @param {Array} history - 对话历史
   * @returns {Promise} 生成的对话
   */
  async generateDialogue(character, prompt, history = []) {
    const systemPrompt = `你是${character.name}，一个${character.description}。你的性格是：${character.personality}。
请以第一人称回应，保持角色一致性。不要解释你的回答，直接以角色的方式对话。`;

    return this.queueRequest(prompt, {
      systemPrompt,
      history,
      temperature: 0.8
    });
  }

  /**
   * 格式化Gemini请求
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   * @returns {Object} 格式化的请求
   */
  formatGeminiRequest(prompt, options) {
    const contents = [];
    
    // 添加系统提示
    contents.push({
      role: 'system',
      parts: [{ text: options.systemPrompt }]
    });
    
    // 添加历史消息
    if (options.history && Array.isArray(options.history)) {
      options.history.forEach(msg => {
        contents.push({
          role: msg.role === 'system' ? 'model' : (msg.role === 'user' ? 'user' : 'model'),
          parts: [{ text: msg.content }]
        });
      });
    }
    
    // 添加当前提示
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });
    
    return {
      contents: contents,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        topP: options.topP || 0.95,
        topK: options.topK || 40
      }
    };
  }
  
  /**
   * 格式化Gemini响应
   * @param {Object} response - API响应
   * @returns {string} 格式化的响应
   */
  formatGeminiResponse(response) {
    try {
      if (!response || !response.candidates || !response.candidates[0]) {
        throw new Error('无效的Gemini响应格式');
      }
      
      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        throw new Error('无效的Gemini响应内容格式');
      }
      
      return candidate.content.parts[0].text || '';
    } catch (error) {
      console.error('解析Gemini响应失败:', error);
      throw error;
    }
  }
  
  /**
   * 格式化本地LLM请求 (Ollama API格式)
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   * @returns {Object} 格式化的请求
   */
  formatLocalLLMRequest(prompt, options) {
    // 构建完整提示
    let fullPrompt = options.systemPrompt + '\n\n';
    
    // 添加历史消息
    if (options.history && Array.isArray(options.history)) {
      options.history.forEach(msg => {
        const role = msg.role === 'system' ? 'Assistant' : (msg.role === 'user' ? 'User' : 'Assistant');
        fullPrompt += `${role}: ${msg.content}\n`;
      });
    }
    
    // 添加当前提示
    fullPrompt += `User: ${prompt}\n\nAssistant: `;
    
    return {
      model: options.model,
      prompt: fullPrompt,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: options.streamResponse || false
    };
  }
  
  /**
   * 格式化本地LLM响应
   * @param {Object} response - API响应
   * @returns {string} 格式化的响应
   */
  formatLocalLLMResponse(response) {
    try {
      if (!response) {
        throw new Error('无效的本地LLM响应格式');
      }
      
      return response.response || response.output || response.text || response.message || response.content || '';
    } catch (error) {
      console.error('解析本地LLM响应失败:', error);
      throw error;
    }
  }
  
  /**
   * 生成场景描述
   * @param {Object} scene - 场景信息
   * @returns {Promise} 生成的场景描述
   */
  async generateSceneDescription(scene) {
    const prompt = `描述以下场景：
地点：${scene.location}
时间：${scene.time}
天气：${scene.weather}
存在的角色：${scene.characters.join(', ')}
特殊物品：${scene.objects ? Object.keys(scene.objects).join(', ') : '无'}
氛围：${scene.mood || '普通'}

请生成一段生动的场景描述，使用丰富的细节和感官描写。`;

    return this.queueRequest(prompt, {
      systemPrompt: '你是一个擅长描述场景的TRPG游戏主持人。',
      temperature: 0.7
    });
  }

  /**
   * 生成故事情节
   * @param {Object} context - 故事上下文
   * @param {string} direction - 故事发展方向
   * @returns {Promise} 生成的故事情节
   */
  async generateStoryPlot(context, direction) {
    const prompt = `基于以下上下文，生成故事的下一个情节发展：
当前情境：${context.currentSituation}
主要角色：${context.mainCharacters.join(', ')}
已发生事件：${context.pastEvents.join('; ')}
故事主题：${context.theme}
期望的发展方向：${direction}

请生成一个合理且有趣的情节发展，包含冲突和转折。`;

    return this.queueRequest(prompt, {
      systemPrompt: '你是一个富有创造力的故事作家，擅长构建引人入胜的情节。',
      temperature: 0.9,
      maxTokens: 1500
    });
  }
  
  /**
   * 生成流式响应
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   * @param {Function} onChunk - 每个数据块的回调函数
   * @returns {Promise} 完整响应
   */
  async generateStreamResponse(prompt, options = {}, onChunk) {
    if (!options.streamResponse) {
      options.streamResponse = true;
    }
    
    // 获取当前提供商
    const provider = this.providers[this.activeProvider];
    if (!provider) {
      throw new Error(`未知的提供商: ${this.activeProvider}`);
    }
    
    // 检查API密钥
    if (!provider.apiKey) {
      throw new Error(`${provider.name}的API密钥未设置`);
    }
    
    // 合并选项
    const mergedOptions = {
      ...this.config,
      ...options,
      model: options.model || this.config.model,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || this.config.maxTokens,
      systemPrompt: options.systemPrompt || '你是一个TRPG游戏助手',
      history: options.history || []
    };
    
    try {
      // 格式化请求
      const formattedRequest = provider.requestFormat.call(
        this, 
        prompt, 
        mergedOptions
      );
      
      // 构建请求选项
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedRequest)
      };
      
      // 添加授权头
      if (this.activeProvider === 'openai' || this.activeProvider === 'deepseek') {
        fetchOptions.headers['Authorization'] = `Bearer ${provider.apiKey}`;
      } else if (this.activeProvider === 'claude') {
        fetchOptions.headers['x-api-key'] = provider.apiKey;
        fetchOptions.headers['anthropic-version'] = '2023-06-01';
      } else if (this.activeProvider === 'gemini') {
        // Gemini使用URL参数传递API密钥
        const endpoint = `${provider.endpoint}?key=${provider.apiKey}`;
        provider.endpoint = endpoint;
      }
      
      // 发送请求
      const response = await fetch(provider.streamEndpoint || provider.endpoint, fetchOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`流式请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let result = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        let text = '';
        
        // 根据不同提供商解析数据块
        if (this.activeProvider === 'openai' || this.activeProvider === 'deepseek') {
          // 处理OpenAI格式的流式响应
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                text += content;
                result += content;
              } catch (e) {
                console.error('解析流式数据失败:', e);
              }
            }
          }
        } else if (this.activeProvider === 'claude') {
          // 处理Claude格式的流式响应
          try {
            const parsed = JSON.parse(chunk);
            const content = parsed.delta?.text || '';
            text += content;
            result += content;
          } catch (e) {
            console.error('解析Claude流式数据失败:', e);
          }
        } else {
          // 其他提供商的通用处理
          text = chunk;
          result += chunk;
        }
        
        // 调用回调函数
        if (text && typeof onChunk === 'function') {
          onChunk(text);
        }
      }
      
      return result;
    } catch (error) {
      console.error('流式生成失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取模型统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalRequests: this.errorStats.totalRequests,
      failedRequests: this.errorStats.failedRequests,
      successRate: this.errorStats.totalRequests > 0 
        ? ((this.errorStats.totalRequests - this.errorStats.failedRequests) / this.errorStats.totalRequests * 100).toFixed(2) + '%' 
        : '0%',
      retrySuccess: this.errorStats.retrySuccess,
      lastError: this.errorStats.lastError ? {
        message: this.errorStats.lastError.message,
        timestamp: new Date().toISOString()
      } : null,
      queueLength: this.requestQueue.length,
      activeProvider: this.providers[this.activeProvider].name,
      activeModel: this.config.model
    };
  }
  
  /**
   * 清除错误统计
   */
  clearErrorStats() {
    this.errorStats = {
      totalRequests: 0,
      failedRequests: 0,
      retrySuccess: 0,
      lastError: null,
      errorLog: []
    };
  }
}

// 导出单例实例
const llmIntegration = new LLMIntegration();
export default llmIntegration;
