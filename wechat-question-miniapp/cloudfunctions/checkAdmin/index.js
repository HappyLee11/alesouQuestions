const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
exports.main = async () => {
  const wxContext = cloud.getWXContext();
  try {
    const res = await db.collection('admins').where({
      openid: wxContext.OPENID,
      enabled: true
    }).limit(1).get();
    const isAdmin = Array.isArray(res.data) && res.data.length > 0;
    return { success: true, isAdmin, openid: wxContext.OPENID };
  } catch (error) {
    return { success: false, isAdmin: false, error };
  }
};
