const { callFunction } = require('./request');
const mock = require('./mock');

function normalizeSearchParams(input) {
  if (typeof input === 'string') {
    return {
      keyword: input,
      page: 1,
      pageSize: 20,
      sortBy: 'relevance',
      status: 'published'
    };
  }

  const payload = input || {};
  return {
    keyword: payload.keyword || '',
    page: payload.page || 1,
    pageSize: payload.pageSize || 20,
    sortBy: payload.sortBy || 'relevance',
    status: payload.status || 'published',
    includeDeleted: !!payload.includeDeleted,
    management: !!payload.management,
    subject: payload.subject || '',
    category: payload.category || '',
    difficulty: payload.difficulty || '',
    type: payload.type || '',
    reviewStatus: payload.reviewStatus || '',
    lifecycleState: payload.lifecycleState || '',
    tag: payload.tag || '',
    searchMode: payload.searchMode || 'keyword'
  };
}

async function searchQuestions(params) {
  const payload = normalizeSearchParams(params);
  const result = await callFunction('searchQuestions', payload);
  if (result && !result.__mockFallback && result.success) {
    const data = result.data || {};
    return {
      items: data.items || [],
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.pageSize || payload.pageSize,
      totalPages: data.totalPages || 1,
      sortBy: data.sortBy || payload.sortBy,
      keyword: data.keyword || payload.keyword,
      summary: data.summary || {},
      facets: data.facets || {},
      suggestions: data.suggestions || [],
      pagination: data.pagination || {},
      request: data.request || {},
      searchMode: data.searchMode || payload.searchMode,
      from: 'cloud'
    };
  }

  const fallback = mock.search(payload);
  return {
    items: fallback.items || [],
    total: fallback.total || 0,
    page: fallback.page || 1,
    pageSize: fallback.pageSize || payload.pageSize,
    totalPages: fallback.totalPages || 1,
    sortBy: payload.sortBy,
    keyword: payload.keyword,
    summary: fallback.summary || {},
    facets: fallback.facets || {},
    suggestions: fallback.suggestions || [],
    pagination: fallback.pagination || {},
    request: fallback.request || {},
    searchMode: payload.searchMode,
    from: 'mock'
  };
}

async function getQuestionDetail(id, options = {}) {
  const result = await callFunction('getQuestionDetail', { id, includeDeleted: !!options.includeDeleted });
  if (result && !result.__mockFallback && result.success) {
    return result.data || null;
  }
  return mock.getById(id, options);
}

async function checkAdmin() {
  const result = await callFunction('checkAdmin');
  if (result && !result.__mockFallback) {
    return {
      success: !!result.success,
      isAdmin: !!result.isAdmin,
      openid: result.openid || '',
      admin: result.data && result.data.admin ? result.data.admin : null
    };
  }
  return {
    success: false,
    isAdmin: false,
    openid: '',
    admin: null
  };
}

async function saveQuestion(payload) {
  return callFunction('saveQuestion', payload, { useMockOnFail: false });
}

async function deleteQuestion(payload) {
  const data = typeof payload === 'string' ? { id: payload } : payload;
  return callFunction('deleteQuestion', data, { useMockOnFail: false });
}

async function importQuestions(items, options = {}) {
  const payload = { ...options };
  if (Array.isArray(items)) {
    payload.items = items;
  }
  return callFunction('importQuestions', payload, { useMockOnFail: false });
}

module.exports = {
  searchQuestions,
  getQuestionDetail,
  checkAdmin,
  saveQuestion,
  deleteQuestion,
  importQuestions
};
