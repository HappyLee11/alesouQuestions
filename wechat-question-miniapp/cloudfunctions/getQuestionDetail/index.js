const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
exports.main = async (event = {}) => {
  const id = event.id;
  if (!id) return { success: false, message: 'id is required' };
  try {
    const res = await db.collection('questions').doc(id).get();
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, message: 'get detail failed', error };
  }
};
