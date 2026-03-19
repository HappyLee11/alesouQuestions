const api = require('../../utils/question');

Page({
  data: {
    keyword: '',
    list: [],
    loading: false
  },
  onShow() {
    this.loadData();
  },
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  async loadData() {
    this.setData({ loading: true });
    try {
      const list = await api.searchQuestions(this.data.keyword);
      this.setData({ list });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  goEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/edit/index?id=${id}` });
  },
  async handleDelete(e) {
    const { id } = e.currentTarget.dataset;
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '删除后不可恢复，确定继续吗？',
        success: (res) => resolve(!!res.confirm)
      });
    });
    if (!confirmed) return;
    try {
      await api.deleteQuestion(id);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadData();
    } catch (error) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
