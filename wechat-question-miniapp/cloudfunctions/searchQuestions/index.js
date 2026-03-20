const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchableText(item = {}) {
  return [
    item.title,
    item.content,
    item.answer,
    item.answerSummary,
    item.analysis,
    item.subject,
    item.category,
    item.source,
    item.imageText,
    (item.tags || []).join(' '),
    (item.titleVariants || []).join(' ')
  ].join(' ').toLowerCase();
}

function keywordTokens(keyword = '') {
  return String(keyword || '')
    .toLowerCase()
    .split(/[\s，,。；;、]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function calcMatchFields(item = {}, query = '') {
  const lower = String(query || '').toLowerCase();
  if (!lower) return [];
  const fields = [];
  [
    ['title', item.title],
    ['content', item.content],
    ['answer', item.answer],
    ['answerSummary', item.answerSummary],
    ['analysis', item.analysis],
    ['imageText', item.imageText],
    ['tags', (item.tags || []).join(' ')],
    ['titleVariants', (item.titleVariants || []).join(' ')]
  ].forEach(([name, value]) => {
    if (String(value || '').toLowerCase().includes(lower)) fields.push(name);
  });
  return fields;
}

function calcRelevance(item, keyword) {
  if (!keyword) return 0;
  const query = keyword.toLowerCase();
  const text = searchableText(item);
  const matched = text.match(new RegExp(escapeRegExp(query), 'g'));
  let score = matched && matched.length ? matched.length * 3 : 0;
  score += keywordTokens(query).reduce((sum, token) => sum + (text.includes(token) ? 1 : 0), 0);
  if (String(item.title || '').toLowerCase().includes(query)) score += 5;
  if (String(item.answerSummary || '').toLowerCase().includes(query)) score += 2;
  return score;
}

function matchesKeyword(item, keyword) {
  if (!keyword) return true;
  const query = keyword.toLowerCase();
  const text = searchableText(item);
  if (text.includes(query)) return true;
  const tokens = keywordTokens(query);
  if (!tokens.length) return false;
  const hitCount = tokens.filter((token) => text.includes(token)).length;
  return hitCount >= Math.min(2, tokens.length);
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

function countBy(list, key) {
  const map = {};
  list.forEach((item) => {
    const value = item[key] || '未设置';
    map[value] = (map[value] || 0) + 1;
  });
  return Object.keys(map).map((value) => ({ value, count: map[value] })).sort((a, b) => b.count - a.count);
}

function countTags(list = []) {
  const map = {};
  list.forEach((item) => {
    (item.tags || []).forEach((tag) => {
      map[tag] = (map[tag] || 0) + 1;
    });
  });
  return Object.keys(map).map((value) => ({ value, count: map[value] })).sort((a, b) => b.count - a.count).slice(0, 12);
}

function buildSuggestions(keyword = '', list = []) {
  const bag = new Set();
  list.forEach((item) => {
    (item.tags || []).slice(0, 2).forEach((tag) => bag.add(tag));
    if (item.subject) bag.add(item.subject);
    if (item.category) bag.add(item.category);
  });
  if (keyword && keyword.toLowerCase().includes('图')) bag.add('HTTP');
  return Array.from(bag).slice(0, 8);
}

function buildExcerpt(item = {}, keyword = '') {
  const source = String(item.content || item.answerSummary || item.answer || '').trim();
  if (!source) return '';
  if (!keyword) return source.slice(0, 88);
  const index = source.toLowerCase().indexOf(keyword.toLowerCase());
  if (index < 0) return source.slice(0, 88);
  const start = Math.max(index - 18, 0);
  const end = Math.min(index + 56, source.length);
  return `${start > 0 ? '…' : ''}${source.slice(start, end)}${end < source.length ? '…' : ''}`;
}

function shapeItem(item = {}, keyword = '') {
  return {
    ...item,
    searchScore: calcRelevance(item, keyword),
    matchedFields: calcMatchFields(item, keyword),
    excerpt: buildExcerpt(item, keyword),
    badges: [item.subject, item.category, item.difficulty, item.type].filter(Boolean)
  };
}

exports.main = async (event = {}) => {
  const keyword = String(event.keyword || '').trim();
  const page = Math.max(Number(event.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);
  const sortBy = event.sortBy || 'relevance';
  const management = !!event.management;
  const status = event.status || (management ? 'all' : 'published');
  const includeDeleted = !!event.includeDeleted || management || status === 'all';
  const subject = String(event.subject || '').trim();
  const category = String(event.category || '').trim();
  const difficulty = String(event.difficulty || '').trim();
  const type = String(event.type || '').trim();
  const reviewStatus = String(event.reviewStatus || '').trim();
  const lifecycleState = String(event.lifecycleState || '').trim();
  const tag = String(event.tag || '').trim();
  const searchMode = event.searchMode || 'keyword';

  try {
    const res = await db.collection('questions').limit(500).get();
    const allItems = Array.isArray(res.data) ? res.data : [];
    const filtered = allItems.filter((item) => {
      if (!includeDeleted && (item.isDeleted || item.status === 'deleted')) return false;
      if (status !== 'all' && (item.status || 'published') !== status) return false;
      if (subject && item.subject !== subject) return false;
      if (category && item.category !== category) return false;
      if (difficulty && item.difficulty !== difficulty) return false;
      if (type && item.type !== type) return false;
      if (reviewStatus && (item.reviewStatus || '') !== reviewStatus) return false;
      if (lifecycleState && (item.lifecycleState || '') !== lifecycleState) return false;
      if (tag && !(item.tags || []).includes(tag)) return false;
      if (!keyword) return true;
      return matchesKeyword(item, keyword);
    });

    const sorted = sortItems(filtered, sortBy, keyword).map((item) => shapeItem(item, keyword));
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    const total = sorted.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const summary = {
      published: allItems.filter((item) => item.status === 'published').length,
      draft: allItems.filter((item) => item.status === 'draft').length,
      review: allItems.filter((item) => item.status === 'review' || item.lifecycleState === 'review').length,
      deleted: allItems.filter((item) => item.status === 'deleted' || item.isDeleted).length
    };

    return {
      success: true,
      code: 0,
      message: 'ok',
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages,
        keyword,
        sortBy,
        searchMode,
        request: {
          keyword,
          page,
          pageSize,
          sortBy,
          searchMode,
          filters: { subject, category, difficulty, type, reviewStatus, lifecycleState, tag, status }
        },
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasPrev: page > 1,
          hasMore: page < totalPages,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null
        },
        suggestions: buildSuggestions(keyword, sorted.length ? sorted : allItems),
        summary,
        facets: {
          subject: countBy(filtered, 'subject'),
          category: countBy(filtered, 'category'),
          difficulty: countBy(filtered, 'difficulty'),
          type: countBy(filtered, 'type'),
          lifecycleState: countBy(filtered, 'lifecycleState'),
          reviewStatus: countBy(filtered, 'reviewStatus'),
          tags: countTags(filtered)
        }
      }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'search failed', error: error.message || error };
  }
};
