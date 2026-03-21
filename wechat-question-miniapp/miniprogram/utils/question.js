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

function buildMockSearchResult(payload, extra = {}) {
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
    from: 'builtin',
    fallbackReason: extra.fallbackReason || '',
    cloudSummary: extra.cloudSummary || null,
    cloudMeta: extra.cloudMeta || null
  };
}

function isCloudDatasetEmpty(data = {}) {
  const summary = data.summary || {};
  const totalInSummary = ['published', 'draft', 'review', 'deleted']
    .reduce((sum, key) => sum + (Number(summary[key]) || 0), 0);
  const itemCount = Number(data.total) || 0;
  return itemCount === 0 && totalInSummary === 0;
}

async function searchQuestions(params) {
  const payload = normalizeSearchParams(params);
  const result = await callFunction('searchQuestions', payload);
  if (result && !result.__mockFallback && result.success) {
    const data = result.data || {};
    if (isCloudDatasetEmpty(data)) {
      return buildMockSearchResult(payload, {
        fallbackReason: 'cloud-empty',
        cloudSummary: data.summary || {},
        cloudMeta: {
          total: data.total || 0,
          request: data.request || {},
          suggestions: data.suggestions || []
        }
      });
    }

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
      from: 'cloud',
      fallbackReason: ''
    };
  }

  return buildMockSearchResult(payload, { fallbackReason: 'cloud-unavailable' });
}

async function getQuestionDetail(id, options = {}) {
  const result = await callFunction('getQuestionDetail', { id, includeDeleted: !!options.includeDeleted });
  if (result && !result.__mockFallback && result.success) {
    if (result.data) {
      return {
        ...result.data,
        from: 'cloud'
      };
    }
    const fallbackDetail = mock.getById(id, options);
    if (fallbackDetail) {
      return {
        ...fallbackDetail,
        from: 'builtin',
        fallbackReason: 'cloud-empty-or-miss'
      };
    }
    return null;
  }
  return mock.getById(id, options);
}

async function checkAdmin() {
  const result = await callFunction('checkAdmin', {}, { useMockOnFail: false });
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

async function getAdminOverview() {
  const result = await callFunction('getAdminOverview', {}, { useMockOnFail: false });
  if (!result || !result.success) {
    throw new Error(result && result.message ? result.message : 'get admin overview failed');
  }
  const data = result.data || {};
  return {
    openid: result.openid || '',
    admin: data.admin || null,
    recentImportTasks: data.recentImportTasks || [],
    recentAuditLogs: data.recentAuditLogs || []
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
  getAdminOverview,
  saveQuestion,
  deleteQuestion,
  importQuestions
};
