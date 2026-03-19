const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
exports.main = async (event = {}) => {
  const keyword = String(event.keyword || '').trim();
  const _ = db.command;

  try {
    let query = db.collection('questions');
    if (keyword) {
      query = query.where(_.or([
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { content: db.RegExp({ regexp: keyword, options: 'i' }) },
        { answer: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]));
    }
    const res = await query.orderBy('updatedAt', 'desc').limit(50).get();
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, message: 'search failed', error };
  }
};
