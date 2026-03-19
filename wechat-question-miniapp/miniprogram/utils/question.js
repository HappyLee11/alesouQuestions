const { callFunction } = require('./request');
const mock = require('./mock');

function normalizeSearchParams(input) {
  if (typeof input === 'string') {
    return {
      keyword: input,
      page: 1,
      pageSize: 20,
      sortBy: 'relevance'
    };
  }

  return {
    keyword: input.keyword || '',
    page: input.page || 1,
    pageSize: input.pageSize || 20,
    sortBy: input.sortBy || 'relevance',
    status: input.status || 'published',
    includeDeleted: !!input.includeDeleted,
    management: !!input.management
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
      sortBy: data.sortBy || payload.sortBy,
      keyword: data.keyword || payload.keyword,
      summary: data.summary || {},
      from: 'cloud'
    };
  }

  const items = mock.search(payload);
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: payload.pageSize,
    sortBy: payload.sortBy,
    keyword: payload.keyword,
    summary: {
      published: items.filter((item) => item.status === 'published').length,
      draft: items.filter((item) => item.status === 'draft').length,
      deleted: items.filter((item) => item.status === 'deleted').length
    },
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
  return callFunction('importQuestions', { items, ...options }, { useMockOnFail: false });
}

module.exports = {
  searchQuestions,
  getQuestionDetail,
  checkAdmin,
  saveQuestion,
  deleteQuestion,
  importQuestions
};
