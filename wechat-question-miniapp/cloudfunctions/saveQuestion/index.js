const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ROLE_PERMISSIONS = {
  super_admin: {
    label: '超级管理员',
    permissions: [
      'question.read',
      'question.write',
      'question.publish',
      'question.archive',
      'question.import',
      'review.approve',
      'review.reject',
      'admin.manage',
      'audit.read',
      'import.task.read'
    ]
  },
  admin: {
    label: '管理员',
    permissions: [
      'question.read',
      'question.write',
      'question.publish',
      'question.archive',
      'question.import',
      'review.approve',
      'review.reject',
      'audit.read',
      'import.task.read'
    ]
  },
  reviewer: {
    label: '审核员',
    permissions: [
      'question.read',
      'review.approve',
      'review.reject',
      'audit.read',
      'import.task.read'
    ]
  },
  operator: {
    label: '运营',
    permissions: [
      'question.read',
      'question.write',
      'question.import',
      'import.task.read'
    ]
  }
};

async function getAdminRecord(openid = '') {
  const res = await db.collection('admins').where({
    openid,
    enabled: true
  }).limit(1).get();
  return Array.isArray(res.data) && res.data.length ? res.data[0] : null;
}

async function safeWriteAuditLog(payload = {}) {
  try {
    await db.collection('audit_logs').add({
      data: {
        ...payload,
        createdAt: payload.createdAt || Date.now()
      }
    });
  } catch (error) {
    console.warn('write audit log failed', error);
  }
}

async function ensureAdmin() {
  const wxContext = cloud.getWXContext();
  const adminRecord = await getAdminRecord(wxContext.OPENID);
  const roleKey = adminRecord && adminRecord.role ? adminRecord.role : 'admin';
  const roleMeta = ROLE_PERMISSIONS[roleKey] || ROLE_PERMISSIONS.admin;
  return {
    isAdmin: !!adminRecord,
    openid: wxContext.OPENID,
    adminRecord,
    role: roleKey,
    permissions: roleMeta.permissions
  };
}

function hasPermission(auth = {}, permission = '') {
  return Array.isArray(auth.permissions) && auth.permissions.includes(permission);
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

function buildVersionSnapshot(payload = {}, version = 1, openid = '', action = 'save', reason = '') {
  return {
    version,
    at: Date.now(),
    by: openid,
    action,
    reason: reason || (action === 'create' ? 'manual create' : 'manual edit'),
    title: payload.title,
    answerSummary: payload.answerSummary,
    status: payload.status,
    reviewStatus: payload.reviewStatus,
    lifecycleState: payload.lifecycleState,
    owner: payload.governance && payload.governance.owner ? payload.governance.owner : '',
    ownerTeam: payload.governance && payload.governance.ownerTeam ? payload.governance.ownerTeam : '',
    reviewer: payload.governance && payload.governance.reviewer ? payload.governance.reviewer : ''
  };
}

function normalizeGovernance(event = {}, existing = {}, openid = '') {
  const current = existing.governance || {};
  const reviewer = String(event.reviewer || current.reviewer || '').trim();
  const reviewComment = String(event.reviewComment || current.reviewComment || '').trim();
  const touchedReview = !!(event.reviewer !== undefined || event.reviewComment !== undefined);
  return {
    owner: String(event.owner || current.owner || '').trim(),
    ownerTeam: String(event.ownerTeam || current.ownerTeam || '').trim(),
    reviewer,
    reviewComment,
    reviewUpdatedAt: touchedReview && (reviewer || reviewComment) ? Date.now() : (current.reviewUpdatedAt || null),
    reviewUpdatedBy: touchedReview && (reviewer || reviewComment) ? openid : (current.reviewUpdatedBy || ''),
    sourceRef: String(event.sourceRef || current.sourceRef || '').trim(),
    importTaskId: current.importTaskId || '',
    importTaskStatus: current.importTaskStatus || '',
    importSheet: current.importSheet || '',
    importRowNumber: current.importRowNumber || null,
    approvalPolicy: String(event.approvalPolicy || current.approvalPolicy || '').trim() || 'manual-review',
    changeReason: String(event.changeReason || '').trim() || 'manual edit'
  };
}

function normalizePayload(event = {}, openid = '', existing = {}) {
  const now = Date.now();
  const status = sanitizeStatus(event.status || existing.status || 'draft');
  const reviewStatus = sanitizeReviewStatus(event.reviewStatus || existing.reviewStatus, status);
  const lifecycleState = buildLifecycleState(status, reviewStatus);
  const title = String(event.title || '').trim();
  const governance = normalizeGovernance(event, existing, openid);
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
    externalId: String(event.externalId || existing.externalId || '').trim(),
    normalizedTitle: normalizeTitle(title),
    isDeleted: status === 'deleted',
    lastAction: event.id ? 'update' : 'create',
    updatedAt: now,
    updatedBy: openid,
    deletedAt: status === 'deleted' ? now : null,
    deletedBy: status === 'deleted' ? openid : '',
    deletedReason: status === 'deleted' ? (event.deletedReason || 'manual archive via edit') : '',
    governance,
    importMeta: existing.importMeta || null
  };
  return payload;
}

function collectRequiredPermissions(payload = {}, existing = {}) {
  const needed = ['question.write'];
  const prevReviewStatus = String(existing.reviewStatus || '').trim().toLowerCase();
  const nextReviewStatus = String(payload.reviewStatus || '').trim().toLowerCase();
  const prevStatus = String(existing.status || '').trim().toLowerCase();
  const nextStatus = String(payload.status || '').trim().toLowerCase();

  if (nextReviewStatus === 'approved' && prevReviewStatus !== 'approved') needed.push('review.approve');
  if (nextReviewStatus === 'rejected' && prevReviewStatus !== 'rejected') needed.push('review.reject');
  if (nextStatus === 'published' && prevStatus !== 'published') needed.push('question.publish');

  return Array.from(new Set(needed));
}

exports.main = async (event = {}) => {
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };

  try {
    const existing = event.id ? (await db.collection('questions').doc(event.id).get()).data || {} : {};
    const payload = normalizePayload(event, auth.openid, existing);
    const neededPermissions = collectRequiredPermissions(payload, existing);
    const missingPermissions = neededPermissions.filter((permission) => !hasPermission(auth, permission));
    if (missingPermissions.length) {
      return {
        success: false,
        code: 403,
        message: `missing permissions: ${missingPermissions.join(', ')}`,
        missingPermissions
      };
    }

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
      const versionSnapshots = (existing.versionSnapshots || []).concat(
        buildVersionSnapshot(payload, version, auth.openid, 'update', event.changeReason)
      ).slice(-20);
      await db.collection('questions').doc(event.id).update({
        data: {
          ...payload,
          createdAt: existing.createdAt,
          createdBy: existing.createdBy,
          version,
          statusHistory,
          versionSnapshots
        }
      });
      await safeWriteAuditLog({
        action: 'question.update',
        entityType: 'question',
        entityId: event.id,
        entityTitle: payload.title,
        result: 'success',
        reason: event.changeReason || 'manual edit',
        operatorOpenid: auth.openid,
        operatorName: auth.adminRecord && auth.adminRecord.name ? auth.adminRecord.name : 'Admin',
        operatorRole: auth.adminRecord && auth.adminRecord.role ? auth.adminRecord.role : 'admin',
        summary: `updated question to ${payload.status}/${payload.reviewStatus} v${version}`
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
    const versionSnapshots = [buildVersionSnapshot(payload, 1, auth.openid, 'create', event.changeReason)];
    const res = await db.collection('questions').add({
      data: {
        ...payload,
        version: 1,
        createdAt,
        createdBy: auth.openid,
        statusHistory,
        versionSnapshots
      }
    });
    await safeWriteAuditLog({
      action: 'question.create',
      entityType: 'question',
      entityId: res._id,
      entityTitle: payload.title,
      result: 'success',
      reason: event.changeReason || 'manual create',
      operatorOpenid: auth.openid,
      operatorName: auth.adminRecord && auth.adminRecord.name ? auth.adminRecord.name : 'Admin',
      operatorRole: auth.adminRecord && auth.adminRecord.role ? auth.adminRecord.role : 'admin',
      summary: `created question as ${payload.status}/${payload.reviewStatus} v1`
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
