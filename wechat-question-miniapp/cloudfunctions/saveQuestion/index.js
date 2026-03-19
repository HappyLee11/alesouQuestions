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

function normalizePayload(event = {}, openid = '') {
  const now = Date.now();
  const status = event.status || 'published';
  return {
    title: String(event.title || '').trim(),
    content: String(event.content || event.title || '').trim(),
    answer: String(event.answer || '').trim(),
    analysis: String(event.analysis || '').trim(),
    tags: Array.isArray(event.tags) ? event.tags.filter(Boolean) : [],
    type: event.type || 'single',
    options: Array.isArray(event.options) ? event.options.filter(Boolean) : [],
    subject: String(event.subject || '').trim(),
    category: String(event.category || '').trim(),
    difficulty: event.difficulty || 'medium',
    source: String(event.source || '').trim(),
    year: event.year || null,
    score: Number(event.score) || 0,
    status,
    isDeleted: status === 'deleted',
    updatedAt: now,
    updatedBy: openid
  };
}

exports.main = async (event = {}) => {
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };

  const payload = normalizePayload(event, auth.openid);
  if (!payload.title || !payload.content) {
    return { success: false, code: 400, message: 'title and content are required' };
  }

  try {
    if (event.id) {
      await db.collection('questions').doc(event.id).update({ data: payload });
      return {
        success: true,
        code: 0,
        message: 'updated',
        data: { id: event.id, action: 'update', updatedAt: payload.updatedAt }
      };
    }
    const createdAt = Date.now();
    const res = await db.collection('questions').add({
      data: {
        ...payload,
        createdAt,
        createdBy: auth.openid,
        deletedAt: null,
        deletedBy: '',
        deletedReason: ''
      }
    });
    return {
      success: true,
      code: 0,
      message: 'created',
      data: { id: res._id, action: 'create', createdAt }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'save failed', error: error.message || error };
  }
};
