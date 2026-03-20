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

function buildVersionSnapshot(current = {}, version = 1, openid = '', action = 'archive', reason = '') {
  return {
    version,
    at: Date.now(),
    by: openid,
    action,
    reason: reason || action,
    title: current.title || '',
    answerSummary: current.answerSummary || '',
    status: current.status || '',
    reviewStatus: current.reviewStatus || '',
    lifecycleState: current.lifecycleState || '',
    owner: current.governance && current.governance.owner ? current.governance.owner : '',
    ownerTeam: current.governance && current.governance.ownerTeam ? current.governance.ownerTeam : '',
    reviewer: current.governance && current.governance.reviewer ? current.governance.reviewer : ''
  };
}

exports.main = async (event = {}) => {
  if (!event.id) return { success: false, code: 400, message: 'id is required' };
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };
  if (!hasPermission(auth, 'question.archive')) {
    return { success: false, code: 403, message: 'missing permissions: question.archive', missingPermissions: ['question.archive'] };
  }

  const now = Date.now();
  const restore = !!event.restore;

  try {
    const currentRes = await db.collection('questions').doc(event.id).get();
    const current = currentRes.data || {};
    const version = Number(current.version || 1) + 1;
    const restoredStatus = current.previousStatus || 'draft';
    const restoredReviewStatus = current.previousReviewStatus || (restoredStatus === 'published' ? 'approved' : 'pending');
    const restoredLifecycleState = restoredStatus === 'published' ? 'published' : restoredStatus === 'review' ? 'review' : 'draft';
    const data = restore ? {
      status: restoredStatus,
      reviewStatus: restoredReviewStatus,
      lifecycleState: restoredLifecycleState,
      isDeleted: false,
      deletedAt: null,
      deletedBy: '',
      deletedReason: '',
      lastAction: 'restore',
      updatedAt: now,
      updatedBy: auth.openid,
      version,
      governance: {
        ...(current.governance || {}),
        changeReason: event.reason || 'manual restore'
      },
      statusHistory: (current.statusHistory || []).concat([{
        at: now,
        by: auth.openid,
        action: 'restore',
        toStatus: restoredStatus,
        toReviewStatus: restoredReviewStatus,
        toLifecycleState: restoredLifecycleState,
        reason: event.reason || 'manual restore'
      }]).slice(-20),
      versionSnapshots: (current.versionSnapshots || []).concat([
        buildVersionSnapshot({
          ...current,
          status: restoredStatus,
          reviewStatus: restoredReviewStatus,
          lifecycleState: restoredLifecycleState
        }, version, auth.openid, 'restore', event.reason || 'manual restore')
      ]).slice(-20)
    } : {
      previousStatus: current.status || 'draft',
      previousReviewStatus: current.reviewStatus || 'pending',
      status: 'deleted',
      reviewStatus: current.reviewStatus || 'pending',
      lifecycleState: 'archived',
      isDeleted: true,
      deletedAt: now,
      deletedBy: auth.openid,
      deletedReason: event.reason || 'manual archive',
      lastAction: 'archive',
      updatedAt: now,
      updatedBy: auth.openid,
      version,
      governance: {
        ...(current.governance || {}),
        changeReason: event.reason || 'manual archive'
      },
      statusHistory: (current.statusHistory || []).concat([{
        at: now,
        by: auth.openid,
        action: 'archive',
        toStatus: 'deleted',
        toReviewStatus: current.reviewStatus || 'pending',
        toLifecycleState: 'archived',
        reason: event.reason || 'manual archive'
      }]).slice(-20),
      versionSnapshots: (current.versionSnapshots || []).concat([
        buildVersionSnapshot({
          ...current,
          status: 'deleted',
          reviewStatus: current.reviewStatus || 'pending',
          lifecycleState: 'archived'
        }, version, auth.openid, 'archive', event.reason || 'manual archive')
      ]).slice(-20)
    };

    await db.collection('questions').doc(event.id).update({ data });
    await safeWriteAuditLog({
      action: restore ? 'question.restore' : 'question.archive',
      entityType: 'question',
      entityId: event.id,
      entityTitle: current.title || '',
      result: 'success',
      reason: event.reason || (restore ? 'manual restore' : 'manual archive'),
      operatorOpenid: auth.openid,
      operatorName: auth.adminRecord && auth.adminRecord.name ? auth.adminRecord.name : 'Admin',
      operatorRole: auth.adminRecord && auth.adminRecord.role ? auth.adminRecord.role : 'admin',
      summary: restore ? `restored question to ${data.status}/${data.reviewStatus} v${version}` : `archived question to deleted/${data.reviewStatus} v${version}`
    });
    return {
      success: true,
      code: 0,
      message: restore ? 'restored' : 'archived',
      data: { id: event.id, action: restore ? 'restore' : 'archive', updatedAt: now, lifecycleState: data.lifecycleState, version }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'delete failed', error: error.message || error };
  }
};
