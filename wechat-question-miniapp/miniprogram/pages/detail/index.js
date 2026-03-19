const api = require('../../utils/question');
const { formatTime } = require('../../utils');

Page({
  data: {
    id: '',
    detail: null,
    loading: true
  },
  async onLoad(options) {
    const id = options.id || '';
    this.setData({ id });
    await this.loadDetail();
  },
  async loadDetail() {
    try {
      const detail = await api.getQuestionDetail(this.data.id);
      if (detail) {
        detail.updatedAtText = formatTime(detail.updatedAt);
        detail.createdAtText = formatTime(detail.createdAt);
        detail.difficultyText = this.formatDifficulty(detail.difficulty);
        detail.statusText = this.formatStatus(detail.status);
      }
      this.setData({ detail });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  formatDifficulty(value) {
    return { easy: '简单', medium: '中等', hard: '困难' }[value] || '未设置';
  },
  formatStatus(value) {
    return { published: '已发布', draft: '草稿', deleted: '已归档' }[value] || '未设置';
  }
});
