App({
  globalData: {
    envId: 'cloudbase-6gffo8cld63d6b10',
    useMockOnFail: true,
    userInfo: null,
    adminChecked: false,
    isAdmin: false,
    adminInfo: null,
    runtime: {
      envId: 'cloudbase-6gffo8cld63d6b10',
      cloudAvailable: !!wx.cloud,
      cloudConfigured: true,
      initError: '',
      useMockOnFail: true
    }
  },
  onLaunch() {
    const envId = this.globalData.envId;
    this.globalData.runtime = {
      envId,
      cloudAvailable: !!wx.cloud,
      cloudConfigured: !!envId && !/your-cloud-env-id/i.test(envId),
      initError: '',
      useMockOnFail: this.globalData.useMockOnFail
    };

    if (!wx.cloud) {
      this.globalData.runtime.initError = '当前基础库不支持云能力，部分功能将使用内置题库数据。';
      console.warn(this.globalData.runtime.initError);
      return;
    }

    try {
      wx.cloud.init({
        env: envId,
        traceUser: true
      });
    } catch (error) {
      this.globalData.runtime.initError = error && error.message ? error.message : '云环境初始化失败';
      console.warn('云环境初始化失败：', error);
    }
  }
});
