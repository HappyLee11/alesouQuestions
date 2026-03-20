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
