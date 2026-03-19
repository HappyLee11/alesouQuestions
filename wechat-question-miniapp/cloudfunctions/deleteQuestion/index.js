const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
async function ensureAdmin() {
  const wxContext = cloud.getWXContext();
  const res = await db.collection('admins').where({
    openid: wxContext.OPENID,
    enabled: true
  }).limit(1).get();
  return Array.isArray(res.data) && res.data.length > 0;
}

exports.main = async (event = {}) => {
  if (!event.id) return { success: false, message: 'id is required' };
  const isAdmin = await ensureAdmin();
  if (!isAdmin) return { success: false, message: 'forbidden' };
  try {
    await db.collection('questions').doc(event.id).remove();
    return { success: true, id: event.id };
  } catch (error) {
    return { success: false, message: 'delete failed', error };
  }
};
