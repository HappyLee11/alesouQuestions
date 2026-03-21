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

function buildEmptyState(result = {}, keyword = '') {
  const suggestions = result.suggestions || [];
  if (result.fallbackReason === 'cloud-empty') {
    return {
      title: keyword ? '云端题库还是空的，先用演示题库帮你搜' : '云端题库还是空的',
      description: keyword
        ? '当前云数据库还没有导入题目，所以这次结果来自内置演示题库。先验证搜索体验没问题，导入正式题库后会自动切回云端。'
        : '当前云数据库还没有导入题目，页面已自动切到内置演示题库，避免看起来像坏掉了一样。导入正式题库后会自动使用云端结果。',
      tips: [
        '可先用下方热门词体验搜索流程',
        '导入题目后，这里会自动切回云端题库',
        '若你在做首轮验收，当前表现属于正常兜底'
      ],
      suggestions
    };
  }

  if (result.from === 'builtin') {
    return {
      title: keyword ? '内置题库里也没搜到' : '先输入关键词开始搜索',
      description: keyword
        ? '当前使用的是内置题库。可以换个更短的关键词，或者点推荐词继续试。'
        : '可以输入题目关键词、题干片段或知识点开始搜索。',
      tips: [
        '试试更短的关键词',
        '可直接点下方推荐词继续搜索'
      ],
      suggestions
    };
  }

  return {
    title: keyword ? '暂无匹配结果' : '先输入关键词开始搜索',
    description: keyword
      ? '云端题库里暂时没找到匹配项。试试更短的关键词，或者点这些相关词继续搜索。'
      : '可以输入题目关键词、题干片段或知识点开始搜索。',
    tips: keyword
      ? ['试试更短的关键词', '检查是否有错别字', '也可以点推荐词继续搜索']
      : ['支持题干片段、知识点和标签词'],
    suggestions
  };
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
      from: 'builtin',
      sourceLabel: '内置题库',
      suggestions: [],
      page: 1,
      totalPages: 1,
      hasMore: false,
      hasPrev: false,
      request: {},
      fallbackReason: ''
    },
    activeFilterText: '未启用筛选',
    expandMap: {},
    topSuggestions: [],
    sourceNotice: '',
    emptyState: buildEmptyState({}, '')
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
  getSourceNotice(result = {}) {
    if (result.fallbackReason === 'cloud-empty') {
      return '云端题库暂无数据，当前已自动切换到内置演示题库。';
    }
    if (result.from === 'builtin') {
      return '当前未连上云端，已使用内置题库兜底。';
    }
    return '';
  },
  applyLocalFilters() {
    const { list, currentFilters, keyword, resultMeta } = this.data;
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
      topSuggestions: (resultMeta.suggestions || []).slice(0, 6),
      emptyState: buildEmptyState(resultMeta, keyword)
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
      const resultMeta = {
        total: result.total || list.length,
        from: result.from || 'cloud',
        sourceLabel: result.fallbackReason === 'cloud-empty'
          ? '内置题库（云端为空）'
          : (result.from || 'cloud') === 'cloud' ? '云端题库' : '内置题库',
        suggestions: result.suggestions || [],
        page: pagination.page || targetPage,
        totalPages: pagination.totalPages || result.totalPages || 1,
        hasMore: !!pagination.hasMore,
        hasPrev: !!pagination.hasPrev,
        request: result.request || {},
        fallbackReason: result.fallbackReason || ''
      };
      this.setData({
        list,
        resultMeta,
        filterOptions: {
          subject: facetToChips(result.facets && result.facets.subject, '全部学科'),
          difficulty: facetToChips(result.facets && result.facets.difficulty, '全部难度'),
          type: facetToChips(result.facets && result.facets.type, '全部题型'),
          tag: facetToChips(result.facets && result.facets.tags, '全部标签')
        },
        currentFilters: { subject: '', difficulty: '', type: '', tag: '' },
        expandMap: {},
        topSuggestions: (result.suggestions || []).slice(0, 6),
        sourceNotice: this.getSourceNotice(resultMeta),
        emptyState: buildEmptyState(resultMeta, keyword)
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
