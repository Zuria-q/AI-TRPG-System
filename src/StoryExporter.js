import { saveAs } from 'file-saver';
import gameHistory from './history';
import agentRegistry from './agent_registry';
import gameState from './game_state';
import novelGenerator from './novel_generator';

/**
 * 故事导出系统
 */
class StoryExporter {
  constructor() {
    this.formats = {
      markdown: {
        name: 'Markdown',
        extension: '.md',
        export: this._exportMarkdown.bind(this)
      },
      json: {
        name: 'JSON',
        extension: '.json',
        export: this._exportJSON.bind(this)
      }
    };
  }

  /**
   * 导出故事
   * @param {string} format - 导出格式
   * @param {Object} options - 导出选项
   */
  async exportStory(format, options = {}) {
    const exporter = this.formats[format];
    if (!exporter) throw new Error(`不支持的导出格式: ${format}`);
    
    const content = await exporter(options);
    const filename = `故事导出_${new Date().toISOString().slice(0, 10)}${exporter.extension}`;
    
    const blob = new Blob([content], { type: this._getMimeType(format) });
    saveAs(blob, filename);
  }

  /**
   * 导出为Markdown
   * @private
   */
  async _exportMarkdown(options) {
    const { style = 'default' } = options;
    const novel = await novelGenerator.generateNovel(style);
    
    // 添加元数据
    const meta = `# ${gameState.worldSettings.title || '未命名故事'}\n\n` +
      `**生成时间**: ${new Date().toLocaleString()}\n` +
      `**主要角色**: ${agentRegistry.getAll().map(a => a.name).join(', ')}\n\n`;
    
    return meta + novel;
  }

  /**
   * 导出为JSON
   * @private
   */
  async _exportJSON() {
    return JSON.stringify({
      meta: {
        generatedAt: new Date().toISOString(),
        version: '1.0'
      },
      world: gameState ? gameState.worldSettings : {},
      characters: agentRegistry ? agentRegistry.getAll() : [],
      timeline: gameHistory && gameHistory.getKeyEvents ? gameHistory.getKeyEvents() : [],
      fullHistory: gameHistory && gameHistory.getAll ? gameHistory.getAll() : []
    }, null, 2);
  }

  /**
   * 获取MIME类型
   * @private
   */
  _getMimeType(format) {
    return {
      markdown: 'text/markdown',
      json: 'application/json'
    }[format];
  }
}

export default new StoryExporter();
