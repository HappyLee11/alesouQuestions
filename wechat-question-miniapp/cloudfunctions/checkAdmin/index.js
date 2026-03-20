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

function enrichAdmin(admin = null) {
  if (!admin) return null;
  const roleKey = admin.role || 'admin';
  const roleMeta = ROLE_PERMISSIONS[roleKey] || ROLE_PERMISSIONS.admin;
  return {
    _id: admin._id,
    name: admin.name || 'Admin',
    role: roleKey,
    roleLabel: roleMeta.label,
    enabled: !!admin.enabled,
    ownerTeam: admin.ownerTeam || '',
    permissions: roleMeta.permissions
  };
}

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  try {
    const res = await db.collection('admins').where({
      openid: wxContext.OPENID,
      enabled: true
    }).limit(1).get();
    const admin = Array.isArray(res.data) && res.data.length ? res.data[0] : null;
    return {
      success: true,
      code: 0,
      message: admin ? 'authorized' : 'not_admin',
      isAdmin: !!admin,
      openid: wxContext.OPENID,
      data: {
        admin: enrichAdmin(admin)
      }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'check admin failed', isAdmin: false, error: error.message || error };
  }
};
