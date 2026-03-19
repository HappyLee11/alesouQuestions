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

function normalizeItem(item = {}) {
  const now = Date.now();
  return {
    title: item.title || '',
    content: item.content || item.title || '',
    answer: item.answer || '',
    analysis: item.analysis || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    type: item.type || 'single',
    options: Array.isArray(item.options) ? item.options : [],
    createdAt: now,
    updatedAt: now
  };
}

exports.main = async (event = {}) => {
  const isAdmin = await ensureAdmin();
  if (!isAdmin) return { success: false, message: 'forbidden' };

  const items = Array.isArray(event.items) ? event.items : [];
  if (!items.length) return { success: false, message: 'items is required' };

  try {
    const tasks = items.map((item) => db.collection('questions').add({ data: normalizeItem(item) }));
    const result = await Promise.all(tasks);
    return {
      success: true,
      inserted: result.length,
      ids: result.map((item) => item._id)
    };
  } catch (error) {
    return { success: false, message: 'import failed', error };
  }
};
