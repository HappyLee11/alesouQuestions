const api = require('../../utils/question');
const { safeJsonParse } = require('../../utils');

const DEFAULT_TEXT = `[
  {
    "题目": "Node.js 事件循环中微任务会在什么时候执行？",
    "题干": "请简述 Promise.then 等微任务在一次事件循环中的执行时机。",
    "答案": "在当前宏任务结束后、下一个宏任务开始前执行。",
    "解析": "微任务队列会在当前调用栈清空后立即依次执行。",
    "标签": "Node.js|事件循环",
    "题型": "qa",
    "学科": "后端开发",
    "分类": "Node.js",
    "难度": "medium",
    "来源": "导入示例",
    "年份": 2025,
    "分值": 5,
    "状态": "draft"
  },
  {
    "questionTitle": "HTTPS 为什么更安全？",
    "description": "请说明 HTTPS 相比 HTTP 多了哪些安全能力。",
    "result": "TLS/SSL 加密、身份校验、完整性保护。",
    "explanation": "正式导入前建议做字段映射、预览和去重。",
    "tagList": ["HTTP", "安全"],
    "questionType": "qa",
    "subject": "Web 基础",
    "category": "安全",
    "level": "medium",
    "source": "异构模板示例",
    "year": 2025,
    "points": 4,
    "status": "published",
    "aliases": ["HTTPS 提升了什么", "HTTPS 更安全的原因"]
  }
]`;

Page({
  data: {
    text: DEFAULT_TEXT,
    loading: false,
    parseError: '',
    preview: null,
    importResult: null,
    dedupeStrategy: 'skip'
  },
  onInput(e) {
    this.setData({ text: e.detail.value });
    this.updatePreview(e.detail.value);
  },
  onLoad() {
    this.updatePreview(this.data.text);
  },
  updatePreview(text) {
    const items = safeJsonParse(text, null);
    if (!Array.isArray(items)) {
      this.setData({ preview: null, parseError: '请输入合法的 JSON 数组' });
      return;
    }
    const preview = this.buildLocalPreview(items);
    this.setData({ preview, parseError: '' });
  },
  buildLocalPreview(items = []) {
    const fieldSets = items.map((item) => Object.keys(item || {}));
    const columns = Array.from(new Set([].concat(...fieldSets))).slice(0, 20);
    const sample = items.slice(0, 3).map((item, index) => ({
      index,
      title: item.title || item.题目 || item.questionTitle || '--',
      keys: Object.keys(item || {}).join(' / ')
    }));
    return {
      total: items.length,
      columns,
      sample
    };
  },
  async previewOnCloud() {
    try {
      const items = JSON.parse(this.data.text || '[]');
      if (!Array.isArray(items) || !items.length) {
        wx.showToast({ title: '请输入至少一条题目', icon: 'none' });
        return;
      }
      this.setData({ loading: true });
      const result = await api.importQuestions(items, { previewOnly: true, dedupeStrategy: this.data.dedupeStrategy });
      this.setData({ importResult: result });
      wx.showToast({ title: '预检完成', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '预检失败，请检查 JSON', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async handleImport() {
    try {
      const items = JSON.parse(this.data.text || '[]');
      if (!Array.isArray(items) || !items.length) {
        wx.showToast({ title: '请输入至少一条题目', icon: 'none' });
        return;
      }
      this.setData({ loading: true });
      const result = await api.importQuestions(items, { dedupeStrategy: this.data.dedupeStrategy });
      this.setData({ importResult: result });
      wx.showToast({ title: '导入已完成', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '导入失败，请检查 JSON', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
