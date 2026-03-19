const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const id = event.id;
  const includeDeleted = !!event.includeDeleted;
  if (!id) return { success: false, code: 400, message: 'id is required' };
  try {
    const res = await db.collection('questions').doc(id).get();
    const data = res.data || null;
    if (!data) {
      return { success: false, code: 404, message: 'question not found' };
    }
    if (!includeDeleted && (data.isDeleted || data.status === 'deleted')) {
      return { success: false, code: 404, message: 'question archived' };
    }
    return { success: true, code: 0, message: 'ok', data };
  } catch (error) {
    return { success: false, code: 500, message: 'get detail failed', error: error.message || error };
  }
};
