const api = require('../../utils/question');

Page({
  data: {
    checking: true,
    isAdmin: false
  },
  async onShow() {
    await this.checkAccess();
  },
  async checkAccess() {
    this.setData({ checking: true });
    try {
      const isAdmin = await api.checkAdmin();
      getApp().globalData.isAdmin = isAdmin;
      this.setData({ isAdmin });
    } catch (error) {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
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
