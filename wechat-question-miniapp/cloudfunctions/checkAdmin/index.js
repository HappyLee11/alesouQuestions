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
    const admin = Array.isArray(res.data) && res.data.length ? res.data[0] : null;
    return {
      success: true,
      code: 0,
      message: admin ? 'authorized' : 'not_admin',
      isAdmin: !!admin,
      openid: wxContext.OPENID,
      data: {
        admin: admin ? {
          _id: admin._id,
          name: admin.name || 'Admin',
          role: admin.role || 'admin',
          enabled: !!admin.enabled
        } : null
      }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'check admin failed', isAdmin: false, error: error.message || error };
  }
};
