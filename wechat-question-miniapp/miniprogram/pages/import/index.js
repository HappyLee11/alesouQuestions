const api = require('../../utils/question');

Page({
  data: {
    text: '[\n  {\n    "title": "示例题目",\n    "content": "示例题目内容",\n    "answer": "示例答案",\n    "analysis": "示例解析",\n    "tags": ["示例", "导入"],\n    "type": "single",\n    "options": ["A", "B", "C", "D"]\n  }\n]',
    loading: false
  },
  onInput(e) {
    this.setData({ text: e.detail.value });
  },
  async handleImport() {
    try {
      const items = JSON.parse(this.data.text || '[]');
      this.setData({ loading: true });
      const result = await api.importQuestions(items);
      wx.showModal({
        title: '导入结果',
        content: JSON.stringify(result, null, 2),
        showCancel: false
      });
    } catch (error) {
      wx.showToast({ title: '导入失败，请检查 JSON', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
