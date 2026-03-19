const api = require('../../utils/question');

Page({
  data: {
    keyword: '',
    loading: false,
    list: []
  },
  onLoad() {
    this.handleSearch();
  },
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  async handleSearch() {
    this.setData({ loading: true });
    try {
      const list = await api.searchQuestions(this.data.keyword);
      this.setData({ list });
    } catch (error) {
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  }
});
