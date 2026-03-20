const api = require('../../utils/question');

Page({
  data: {
    checking: true,
    isAdmin: false,
    openid: '',
    admin: null,
    stats: {
      total: 0,
      published: 0,
      draft: 0,
      review: 0,
      deleted: 0,
      approved: 0,
      pending: 0,
      rejected: 0
    }
  },
  async onShow() {
    await this.checkAccess();
  },
  async checkAccess() {
    this.setData({ checking: true });
    try {
      const info = await api.checkAdmin();
      getApp().globalData.isAdmin = info.isAdmin;
      this.setData({
        isAdmin: info.isAdmin,
        openid: info.openid,
        admin: info.admin
      });
      if (info.isAdmin) {
        await this.loadStats();
      }
    } catch (error) {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
  },
  async loadStats() {
    const result = await api.searchQuestions({
      keyword: '',
      management: true,
      status: 'all',
      includeDeleted: true,
      page: 1,
      pageSize: 100,
      sortBy: 'updatedAt'
    });
    const items = result.items || [];
    this.setData({
      stats: {
        total: items.length,
        published: items.filter((item) => item.lifecycleState === 'published').length,
        draft: items.filter((item) => item.lifecycleState === 'draft').length,
        review: items.filter((item) => item.lifecycleState === 'review').length,
        deleted: items.filter((item) => item.lifecycleState === 'archived' || item.status === 'deleted').length,
        approved: items.filter((item) => item.reviewStatus === 'approved').length,
        pending: items.filter((item) => item.reviewStatus === 'pending').length,
        rejected: items.filter((item) => item.reviewStatus === 'rejected').length
      }
    });
  },
  goList() {
    wx.navigateTo({ url: '/pages/list/index' });
  },
  goImport() {
    wx.navigateTo({ url: '/pages/import/index' });
  },
  goCreate() {
    wx.navigateTo({ url: '/pages/edit/index' });
  }
});
