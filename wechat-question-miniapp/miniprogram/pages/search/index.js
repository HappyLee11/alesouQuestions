const api = require('../../utils/question');
const { highlightText, formatTime } = require('../../utils');

const HISTORY_KEY = 'question-search-history';
const HOT_TERMS = ['HTTP', 'JavaScript', 'Redis', 'Vue', 'MySQL', 'HTTPS'];
const SORT_OPTIONS = [
  { label: '综合相关', value: 'relevance' },
  { label: '最近更新', value: 'updatedAt' },
  { label: '难度优先', value: 'difficulty' }
];
const GROUP_OPTIONS = [
  { label: '按学科分组', value: 'subject' },
  { label: '按分类分组', value: 'category' }
];
const TYPE_LABELS = { single: '单选题', multiple: '多选题', qa: '问答题' };
const DIFFICULTY_LABELS = { easy: '简单', medium: '中等', hard: '困难' };

function facetToChips(list = [], allLabel = '全部') {
  return [{ value: '', label: allLabel }].concat((list || []).map((item) => ({
    value: item.value,
    label: `${item.value} (${item.count})`
  })));
}

function groupItems(list = [], key = 'subject') {
  const map = {};
  list.forEach((item) => {
    const name = item[key] || '未设置';
    if (!map[name]) map[name] = [];
    map[name].push(item);
  });
  return Object.keys(map).map((name) => ({
    name,
    count: map[name].length,
    items: map[name]
  })).sort((a, b) => b.count - a.count);
}

Page({
  data: {
    keyword: '',
    loading: false,
    list: [],
    displayList: [],
    groupedList: [],
    history: [],
    hotTerms: HOT_TERMS,
    sortOptions: SORT_OPTIONS,
    sortIndex: 0,
    groupOptions: GROUP_OPTIONS,
    groupIndex: 0,
    useGroupView: true,
    searchMode: 'keyword',
    currentFilters: {
      subject: '',
      difficulty: '',
      type: ''
    },
    filterOptions: {
      subject: [{ value: '', label: '全部学科' }],
      difficulty: [{ value: '', label: '全部难度' }],
      type: [{ value: '', label: '全部题型' }]
    },
    resultMeta: {
      total: 0,
      from: 'mock',
      suggestions: [],
      page: 1,
      totalPages: 1,
      hasMore: false,
      hasPrev: false
    },
    expandMap: {}
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
    this.setData({ keyword: e.detail.value, searchMode: 'keyword' });
  },
  onChangeSort(e) {
    this.setData({ sortIndex: Number(e.detail.value) || 0 });
    this.handleSearch({ resetPage: true });
  },
  onChangeGroup(e) {
    this.setData({ groupIndex: Number(e.detail.value) || 0 });
    this.applyLocalFilters();
  },
  toggleGroupView() {
    this.setData({ useGroupView: !this.data.useGroupView });
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
  applyLocalFilters() {
    const { list, currentFilters, groupOptions, groupIndex, keyword } = this.data;
    const filtered = (list || []).filter((item) => {
      if (currentFilters.subject && item.subject !== currentFilters.subject) return false;
      if (currentFilters.difficulty && item.difficulty !== currentFilters.difficulty) return false;
      if (currentFilters.type && item.type !== currentFilters.type) return false;
      return true;
    }).map((item) => this.buildDisplayItem(item, keyword));

    this.setData({
      displayList: filtered,
      groupedList: groupItems(filtered, groupOptions[groupIndex].value)
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
        searchMode: this.data.searchMode
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
          hasPrev: !!pagination.hasPrev
        },
        filterOptions: {
          subject: facetToChips(result.facets && result.facets.subject, '全部学科'),
          difficulty: facetToChips(result.facets && result.facets.difficulty, '全部难度'),
          type: facetToChips(result.facets && result.facets.type, '全部题型')
        },
        currentFilters: { subject: '', difficulty: '', type: '' },
        expandMap: {}
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
    this.setData({ keyword, searchMode: 'keyword' });
    this.handleSearch({ resetPage: true });
  },
  onUseImageDemo() {
    this.setData({
      keyword: '图中题干 HTTP 状态码 资源不存在',
      searchMode: 'image'
    });
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
