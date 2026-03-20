const api = require('../../utils/question');
const { highlightText, formatTime } = require('../../utils');

const HISTORY_KEY = 'question-search-history';
const HOT_TERMS = ['HTTP', 'JavaScript', 'Redis', 'Vue', 'MySQL', 'HTTPS'];
const SORT_OPTIONS = [
  { label: '综合排序', value: 'relevance' },
  { label: '最近更新', value: 'updatedAt' },
  { label: '按难度', value: 'difficulty' }
];
const TYPE_LABELS = { single: '单选题', multiple: '多选题', qa: '问答题' };
const DIFFICULTY_LABELS = { easy: '简单', medium: '中等', hard: '困难' };

function facetToChips(list = [], allLabel = '全部') {
  return [{ value: '', label: allLabel }].concat((list || []).map((item) => ({
    value: item.value,
    label: `${item.value} (${item.count})`
  })));
}

Page({
  data: {
    keyword: '',
    loading: false,
    list: [],
    displayList: [],
    history: [],
    hotTerms: HOT_TERMS,
    quickTerms: HOT_TERMS.slice(0, 4),
    sortOptions: SORT_OPTIONS,
    sortIndex: 0,
    currentFilters: {
      subject: '',
      difficulty: '',
      type: '',
      tag: ''
    },
    filterOptions: {
      subject: [{ value: '', label: '全部学科' }],
      difficulty: [{ value: '', label: '全部难度' }],
      type: [{ value: '', label: '全部题型' }],
      tag: [{ value: '', label: '全部标签' }]
    },
    resultMeta: {
      total: 0,
      from: 'mock',
      suggestions: [],
      page: 1,
      totalPages: 1,
      hasMore: false,
      hasPrev: false,
      request: {}
    },
    activeFilterText: '未启用筛选',
    expandMap: {},
    topSuggestions: []
  },
  onLoad(options = {}) {
    this.loadHistory();
    const keyword = options.keyword ? decodeURIComponent(options.keyword) : '';
    if (keyword) {
      this.setData({ keyword });
    }
    this.handleSearch({ resetPage: true });
  },
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  onChangeSort(e) {
    this.setData({ sortIndex: Number(e.detail.value) || 0 });
    this.handleSearch({ resetPage: true });
  },
  onTapFilter(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({ [`currentFilters.${field}`]: value || '' });
    this.applyLocalFilters();
  },
  buildDisplayItem(item, keyword) {
    return {
      ...item,
      titleSegments: highlightText(item.title, keyword),
      contentSegments: highlightText(item.content, keyword),
      answerPreview: item.answerSummary || item.answer || '暂无答案',
      analysisPreview: item.analysis || '暂无解析',
      updatedAtText: formatTime(item.updatedAt),
      difficultyText: DIFFICULTY_LABELS[item.difficulty] || '未设置',
      typeText: TYPE_LABELS[item.type] || '未知题型'
    };
  },
  getActiveFilterText() {
    const { currentFilters } = this.data;
    const parts = [];
    if (currentFilters.subject) parts.push(`学科：${currentFilters.subject}`);
    if (currentFilters.difficulty) parts.push(`难度：${DIFFICULTY_LABELS[currentFilters.difficulty] || currentFilters.difficulty}`);
    if (currentFilters.type) parts.push(`题型：${TYPE_LABELS[currentFilters.type] || currentFilters.type}`);
    if (currentFilters.tag) parts.push(`标签：${currentFilters.tag}`);
    return parts.length ? parts.join(' · ') : '未启用筛选';
  },
  applyLocalFilters() {
    const { list, currentFilters, keyword } = this.data;
    const filtered = (list || []).filter((item) => {
      if (currentFilters.subject && item.subject !== currentFilters.subject) return false;
      if (currentFilters.difficulty && item.difficulty !== currentFilters.difficulty) return false;
      if (currentFilters.type && item.type !== currentFilters.type) return false;
      if (currentFilters.tag && !(item.tags || []).includes(currentFilters.tag)) return false;
      return true;
    }).map((item) => this.buildDisplayItem(item, keyword));

    this.setData({
      displayList: filtered,
      activeFilterText: this.getActiveFilterText(),
      topSuggestions: (this.data.resultMeta.suggestions || []).slice(0, 6)
    });
  },
  async handleSearch(options = {}) {
    const targetPage = options.page || (options.resetPage ? 1 : this.data.resultMeta.page || 1);
    this.setData({ loading: true });
    const keyword = this.data.keyword.trim();
    try {
      const currentSort = this.data.sortOptions[this.data.sortIndex].value;
      const result = await api.searchQuestions({
        keyword,
        sortBy: currentSort,
        page: targetPage,
        pageSize: 4,
        status: 'all',
        searchMode: 'keyword'
      });
      const list = (result.items || []).filter((item) => item.status !== 'deleted');
      const pagination = result.pagination || {};
      this.setData({
        list,
        resultMeta: {
          total: result.total || list.length,
          from: result.from || 'cloud',
          suggestions: result.suggestions || [],
          page: pagination.page || targetPage,
          totalPages: pagination.totalPages || result.totalPages || 1,
          hasMore: !!pagination.hasMore,
          hasPrev: !!pagination.hasPrev,
          request: result.request || {}
        },
        filterOptions: {
          subject: facetToChips(result.facets && result.facets.subject, '全部学科'),
          difficulty: facetToChips(result.facets && result.facets.difficulty, '全部难度'),
          type: facetToChips(result.facets && result.facets.type, '全部题型'),
          tag: facetToChips(result.facets && result.facets.tags, '全部标签')
        },
        currentFilters: { subject: '', difficulty: '', type: '', tag: '' },
        expandMap: {},
        topSuggestions: (result.suggestions || []).slice(0, 6)
      });
      this.applyLocalFilters();
      if (keyword) this.saveHistory(keyword);
    } catch (error) {
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  goPrevPage() {
    if (!this.data.resultMeta.hasPrev) return;
    this.handleSearch({ page: Math.max((this.data.resultMeta.page || 1) - 1, 1) });
  },
  goNextPage() {
    if (!this.data.resultMeta.hasMore) return;
    this.handleSearch({ page: (this.data.resultMeta.page || 1) + 1 });
  },
  loadHistory() {
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    this.setData({ history });
  },
  saveHistory(keyword) {
    const list = [keyword].concat((this.data.history || []).filter((item) => item !== keyword)).slice(0, 8);
    wx.setStorageSync(HISTORY_KEY, list);
    this.setData({ history: list });
  },
  clearHistory() {
    wx.removeStorageSync(HISTORY_KEY);
    this.setData({ history: [] });
  },
  onTapTerm(e) {
    const keyword = e.currentTarget.dataset.term;
    this.setData({ keyword });
    this.handleSearch({ resetPage: true });
  },
  toggleAnswer(e) {
    const { id } = e.currentTarget.dataset;
    const current = !!this.data.expandMap[id];
    this.setData({ [`expandMap.${id}`]: !current });
  },
  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  }
});
