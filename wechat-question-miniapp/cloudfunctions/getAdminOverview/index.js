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

async function safeGet(collectionName, builder) {
  try {
    const query = builder(db.collection(collectionName));
    const res = await query.get();
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    return [];
  }
}

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  try {
    const admin = await getAdminRecord(wxContext.OPENID);
    if (!admin) {
      return {
        success: false,
        code: 403,
        message: 'forbidden',
        isAdmin: false,
        openid: wxContext.OPENID
      };
    }

    const roleKey = admin.role || 'admin';
    const roleMeta = ROLE_PERMISSIONS[roleKey] || ROLE_PERMISSIONS.admin;

    const [recentImportTasks, recentAuditLogs] = await Promise.all([
      safeGet('import_tasks', (collection) => collection.orderBy('updatedAt', 'desc').limit(6)),
      safeGet('audit_logs', (collection) => collection.orderBy('createdAt', 'desc').limit(8))
    ]);

    return {
      success: true,
      code: 0,
      message: 'ok',
      isAdmin: true,
      openid: wxContext.OPENID,
      data: {
        admin: {
          _id: admin._id,
          name: admin.name || 'Admin',
          role: roleKey,
          roleLabel: roleMeta.label,
          enabled: !!admin.enabled,
          ownerTeam: admin.ownerTeam || '',
          permissions: roleMeta.permissions
        },
        recentImportTasks: recentImportTasks.map((item) => ({
          _id: item._id,
          taskId: item.taskId || '',
          taskName: item.taskName || item.fileName || '',
          batchId: item.batchId || '',
          taskStatus: item.taskStatus || '',
          sourceType: item.sourceType || '',
          templateType: item.templateType || '',
          fileName: item.fileName || '',
          approvalPolicy: item.approvalPolicy || '',
          total: item.total || 0,
          valid: item.valid || 0,
          invalid: item.invalid || 0,
          warnings: item.warningCount || item.warnings || 0,
          inserted: item.inserted || 0,
          updated: item.updated || 0,
          mode: item.mode || '',
          updatedAt: item.updatedAt || item.createdAt || Date.now()
        })),
        recentAuditLogs: recentAuditLogs.map((item) => ({
          _id: item._id,
          action: item.action || '',
          entityType: item.entityType || '',
          entityId: item.entityId || '',
          entityTitle: item.entityTitle || '',
          result: item.result || '',
          reason: item.reason || '',
          operatorName: item.operatorName || '',
          operatorRole: item.operatorRole || '',
          summary: item.summary || '',
          createdAt: item.createdAt || Date.now()
        }))
      }
    };
  } catch (error) {
    return {
      success: false,
      code: 500,
      message: 'get overview failed',
      isAdmin: false,
      error: error.message || error
    };
  }
};
