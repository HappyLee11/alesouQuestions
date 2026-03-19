function callFunction(name, data = {}, options = {}) {
  const app = getApp();
  const useMockOnFail = options.useMockOnFail !== undefined
    ? options.useMockOnFail
    : app.globalData.useMockOnFail;

  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject(new Error('当前环境不支持 wx.cloud'));
      return;
    }

    wx.cloud.callFunction({
      name,
      data,
      success: (res) => resolve(res.result),
      fail: (err) => {
        if (useMockOnFail) {
          resolve({ __mockFallback: true, error: err });
          return;
        }
        reject(err);
      }
    });
  });
}

module.exports = {
  callFunction
};
