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
  const isAdmin = await ensureAdmin();
  if (!isAdmin) return { success: false, message: 'forbidden' };

  const now = Date.now();
  const payload = {
    title: event.title || '',
    content: event.content || '',
    answer: event.answer || '',
    analysis: event.analysis || '',
    tags: Array.isArray(event.tags) ? event.tags : [],
    type: event.type || 'single',
    options: Array.isArray(event.options) ? event.options : [],
    updatedAt: now
  };

  try {
    if (event.id) {
      await db.collection('questions').doc(event.id).update({ data: payload });
      return { success: true, action: 'update', id: event.id };
    }
    const res = await db.collection('questions').add({
      data: { ...payload, createdAt: now }
    });
    return { success: true, action: 'create', id: res._id };
  } catch (error) {
    return { success: false, message: 'save failed', error };
  }
};
