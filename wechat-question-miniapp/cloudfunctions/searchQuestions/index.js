const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calcRelevance(item, keyword) {
  if (!keyword) return 0;
  const query = keyword.toLowerCase();
  const text = [
    item.title,
    item.content,
    item.answer,
    item.analysis,
    item.subject,
    item.category,
    item.source,
    (item.tags || []).join(' ')
  ].join(' ').toLowerCase();
  const matched = text.match(new RegExp(escapeRegExp(query), 'g'));
  return matched ? matched.length : 0;
}

function sortItems(list, sortBy, keyword) {
  const weight = { easy: 1, medium: 2, hard: 3 };
  const items = list.slice();
  if (sortBy === 'updatedAt') {
    return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  if (sortBy === 'difficulty') {
    return items.sort((a, b) => (weight[b.difficulty] || 0) - (weight[a.difficulty] || 0));
  }
  return items.sort((a, b) => {
    const diff = calcRelevance(b, keyword) - calcRelevance(a, keyword);
    if (diff !== 0) return diff;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

exports.main = async (event = {}) => {
  const keyword = String(event.keyword || '').trim();
  const page = Math.max(Number(event.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);
  const sortBy = event.sortBy || 'relevance';
  const management = !!event.management;
  const status = event.status || (management ? 'all' : 'published');
  const includeDeleted = !!event.includeDeleted || management || status === 'all';

  try {
    const res = await db.collection('questions').limit(100).get();
    const allItems = Array.isArray(res.data) ? res.data : [];
    const filtered = allItems.filter((item) => {
      if (!includeDeleted && (item.isDeleted || item.status === 'deleted')) return false;
      if (status !== 'all' && (item.status || 'published') !== status) return false;
      if (!keyword) return true;
      return [
        item.title,
        item.content,
        item.answer,
        item.analysis,
        item.subject,
        item.category,
        item.source,
        (item.tags || []).join(' ')
      ].join(' ').toLowerCase().includes(keyword.toLowerCase());
    });
    const sorted = sortItems(filtered, sortBy, keyword);
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    return {
      success: true,
      code: 0,
      message: 'ok',
      data: {
        items,
        total: sorted.length,
        page,
        pageSize,
        keyword,
        sortBy,
        summary: {
          published: allItems.filter((item) => item.status === 'published').length,
          draft: allItems.filter((item) => item.status === 'draft').length,
          deleted: allItems.filter((item) => item.status === 'deleted' || item.isDeleted).length
        }
      }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'search failed', error: error.message || error };
  }
};
