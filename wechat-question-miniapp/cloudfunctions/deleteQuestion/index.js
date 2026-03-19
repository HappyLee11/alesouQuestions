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

exports.main = async (event = {}) => {
  if (!event.id) return { success: false, code: 400, message: 'id is required' };
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };

  const now = Date.now();
  const restore = !!event.restore;
  const data = restore ? {
    status: 'published',
    isDeleted: false,
    deletedAt: null,
    deletedBy: '',
    deletedReason: '',
    updatedAt: now,
    updatedBy: auth.openid
  } : {
    status: 'deleted',
    isDeleted: true,
    deletedAt: now,
    deletedBy: auth.openid,
    deletedReason: event.reason || 'manual archive',
    updatedAt: now,
    updatedBy: auth.openid
  };

  try {
    await db.collection('questions').doc(event.id).update({ data });
    return {
      success: true,
      code: 0,
      message: restore ? 'restored' : 'archived',
      data: { id: event.id, action: restore ? 'restore' : 'archive', updatedAt: now }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'delete failed', error: error.message || error };
  }
};
