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

function normalizeTitle(title = '') {
  return String(title).replace(/[\s\-—_【】\[\]()（）]/g, '').toLowerCase();
}

function sanitizeStatus(status = '') {
  const value = String(status || '').trim().toLowerCase();
  if (['published', 'draft', 'deleted', 'review'].includes(value)) return value;
  return 'draft';
}

function sanitizeReviewStatus(value = '', status = 'draft') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['pending', 'approved', 'rejected'].includes(normalized)) return normalized;
  if (status === 'published') return 'approved';
  if (status === 'review') return 'pending';
  return 'pending';
}

function buildLifecycleState(status = 'draft', reviewStatus = 'pending') {
  if (status === 'deleted') return 'archived';
  if (status === 'published') return reviewStatus === 'approved' ? 'published' : 'review';
  if (status === 'review') return 'review';
  return 'draft';
}

function buildStatusHistoryEntry(payload = {}, openid = '', action = 'save', reason = '') {
  return {
    at: Date.now(),
    by: openid,
    action,
    toStatus: payload.status,
    toReviewStatus: payload.reviewStatus,
    toLifecycleState: payload.lifecycleState,
    reason: reason || (action === 'create' ? 'manual create' : 'manual edit')
  };
}

function normalizePayload(event = {}, openid = '', existing = {}) {
  const now = Date.now();
  const status = sanitizeStatus(event.status || existing.status || 'draft');
  const reviewStatus = sanitizeReviewStatus(event.reviewStatus || existing.reviewStatus, status);
  const lifecycleState = buildLifecycleState(status, reviewStatus);
  const title = String(event.title || '').trim();
  const payload = {
    title,
    content: String(event.content || event.title || '').trim(),
    answer: String(event.answer || '').trim(),
    answerSummary: String(event.answerSummary || '').trim(),
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
    reviewStatus,
    lifecycleState,
    titleVariants: Array.isArray(event.titleVariants) ? event.titleVariants.filter(Boolean) : [],
    imageText: String(event.imageText || '').trim(),
    relatedIds: Array.isArray(event.relatedIds) ? event.relatedIds.filter(Boolean) : [],
    normalizedTitle: normalizeTitle(title),
    isDeleted: status === 'deleted',
    lastAction: event.id ? 'update' : 'create',
    updatedAt: now,
    updatedBy: openid,
    deletedAt: status === 'deleted' ? now : null,
    deletedBy: status === 'deleted' ? openid : '',
    deletedReason: status === 'deleted' ? (event.deletedReason || 'manual archive via edit') : ''
  };
  return payload;
}

exports.main = async (event = {}) => {
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };

  try {
    const existing = event.id ? (await db.collection('questions').doc(event.id).get()).data || {} : {};
    const payload = normalizePayload(event, auth.openid, existing);
    if (!payload.title || !payload.content || !payload.answer) {
      return { success: false, code: 400, message: 'title, content and answer are required' };
    }
    if (!['single', 'multiple', 'qa'].includes(payload.type)) {
      return { success: false, code: 400, message: 'invalid type' };
    }
    if (!['easy', 'medium', 'hard'].includes(payload.difficulty)) {
      return { success: false, code: 400, message: 'invalid difficulty' };
    }

    if (event.id) {
      const version = Number(existing.version || 1) + 1;
      const statusHistory = (existing.statusHistory || []).concat(
        buildStatusHistoryEntry(payload, auth.openid, 'update', event.changeReason)
      ).slice(-20);
      await db.collection('questions').doc(event.id).update({
        data: {
          ...payload,
          createdAt: existing.createdAt,
          createdBy: existing.createdBy,
          version,
          statusHistory
        }
      });
      return {
        success: true,
        code: 0,
        message: 'updated',
        data: { id: event.id, action: 'update', updatedAt: payload.updatedAt, version, lifecycleState: payload.lifecycleState }
      };
    }

    const createdAt = Date.now();
    const statusHistory = [buildStatusHistoryEntry(payload, auth.openid, 'create', event.changeReason)];
    const res = await db.collection('questions').add({
      data: {
        ...payload,
        version: 1,
        createdAt,
        createdBy: auth.openid,
        statusHistory
      }
    });
    return {
      success: true,
      code: 0,
      message: 'created',
      data: { id: res._id, action: 'create', createdAt, version: 1, lifecycleState: payload.lifecycleState }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'save failed', error: error.message || error };
  }
};
