const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function ensureAdmin() {
  const wxContext = cloud.getWXContext();
  const res = await db.collection('admins').where({
    openid: wxContext.OPENID,
    enabled: true
  }).limit(1).get();
  return {
    isAdmin: Array.isArray(res.data) && res.data.length > 0,
    openid: wxContext.OPENID
  };
}

function normalizeItem(item = {}, openid = '') {
  const now = Date.now();
  const status = item.status || 'draft';
  return {
    title: String(item.title || '').trim(),
    content: String(item.content || item.title || '').trim(),
    answer: String(item.answer || '').trim(),
    analysis: String(item.analysis || '').trim(),
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
    type: item.type || 'single',
    options: Array.isArray(item.options) ? item.options.filter(Boolean) : [],
    subject: String(item.subject || '').trim(),
    category: String(item.category || '').trim(),
    difficulty: item.difficulty || 'medium',
    source: String(item.source || '').trim(),
    year: item.year || null,
    score: Number(item.score) || 0,
    status,
    isDeleted: status === 'deleted',
    createdAt: now,
    updatedAt: now,
    createdBy: openid,
    updatedBy: openid,
    deletedAt: status === 'deleted' ? now : null,
    deletedBy: status === 'deleted' ? openid : '',
    deletedReason: status === 'deleted' ? 'imported as archived' : ''
  };
}

exports.main = async (event = {}) => {
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };

  const items = Array.isArray(event.items) ? event.items : [];
  if (!items.length) return { success: false, code: 400, message: 'items is required' };

  const prepared = items.map((item, index) => ({ index, raw: item, normalized: normalizeItem(item, auth.openid) }));
  const valid = prepared.filter((item) => item.normalized.title && item.normalized.content);
  const invalid = prepared.filter((item) => !(item.normalized.title && item.normalized.content));

  try {
    const ids = [];
    for (const item of valid) {
      const res = await db.collection('questions').add({ data: item.normalized });
      ids.push(res._id);
    }
    return {
      success: true,
      code: 0,
      message: 'imported',
      data: {
        inserted: ids.length,
        failed: invalid.length,
        ids,
        errors: invalid.map((item) => ({ index: item.index, message: 'title/content required' }))
      }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'import failed', error: error.message || error };
  }
};
