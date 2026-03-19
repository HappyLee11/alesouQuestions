const api = require('../../utils/question');
const { safeJsonParse } = require('../../utils');

const DEFAULT_TEXT = `[
  {
    "title": "Node.js 事件循环中微任务会在什么时候执行？",
    "content": "请简述 Promise.then 等微任务在一次事件循环中的执行时机。",
    "answer": "在当前宏任务结束后、下一个宏任务开始前执行。",
    "analysis": "微任务队列会在当前调用栈清空后立即依次执行。",
    "tags": ["Node.js", "事件循环"],
    "type": "qa",
    "options": [],
    "subject": "后端开发",
    "category": "Node.js",
    "difficulty": "medium",
    "source": "导入示例",
    "year": 2025,
    "score": 5,
    "status": "draft"
  }
]`;

Page({
  data: {
    text: DEFAULT_TEXT,
    loading: false,
    previewCount: 1,
    previewTitle: 'Node.js 事件循环中微任务会在什么时候执行？',
    parseError: '',
    importResult: null
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
      this.setData({ previewCount: 0, previewTitle: '', parseError: '请输入合法的 JSON 数组' });
      return;
    }
    this.setData({
      previewCount: items.length,
      previewTitle: items[0] && items[0].title ? items[0].title : '',
      parseError: ''
    });
  },
  async handleImport() {
    try {
      const items = JSON.parse(this.data.text || '[]');
      if (!Array.isArray(items) || !items.length) {
        wx.showToast({ title: '请输入至少一条题目', icon: 'none' });
        return;
      }
      this.setData({ loading: true });
      const result = await api.importQuestions(items, { mode: 'insert' });
      this.setData({ importResult: result });
      wx.showToast({ title: '导入已完成', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '导入失败，请检查 JSON', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
