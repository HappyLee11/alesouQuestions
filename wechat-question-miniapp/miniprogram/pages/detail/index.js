const api = require('../../utils/question');

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
      this.setData({ detail });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
