App({
  globalData: {
    envId: 'your-cloud-env-id',
    useMockOnFail: true,
    userInfo: null,
    adminChecked: false,
    isAdmin: false
  },
  onLaunch() {
    if (!wx.cloud) {
      console.warn('当前基础库不支持云能力，部分功能将使用本地 mock。');
      return;
    }
    try {
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true
      });
    } catch (error) {
      console.warn('云环境初始化失败：', error);
    }
  }
});
