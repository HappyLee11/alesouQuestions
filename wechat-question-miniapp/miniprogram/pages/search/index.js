const api = require('../../utils/question');
const { highlightText, formatTime } = require('../../utils');

const HISTORY_KEY = 'question-search-history';
const HOT_TERMS = ['HTTP', 'JavaScript', 'Redis', 'Vue', 'MySQL', 'HTTPS'];
const SORT_OPTIONS = [
  { label: '综合相关', value: 'relevance' },
  { label: '最近更新', value: 'updatedAt' },
  { label: '难度优先', value: 'difficulty' }
];

Page({
  data: {
    keyword: '',
    loading: false,
    list: [],
    history: [],
    hotTerms: HOT_TERMS,
    sortOptions: SORT_OPTIONS,
    sortIndex: 0,
    resultMeta: {
      total: 0,
      from: 'mock'
    }
  },
  onLoad(options = {}) {
    this.loadHistory();
    const keyword = options.keyword ? decodeURIComponent(options.keyword) : '';
    if (keyword) {
      this.setData({ keyword });
    }
    this.handleSearch();
  },
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  onChangeSort(e) {
    this.setData({ sortIndex: Number(e.detail.value) || 0 });
    this.handleSearch();
  },
  async handleSearch() {
    this.setData({ loading: true });
    const keyword = this.data.keyword.trim();
    try {
      const currentSort = this.data.sortOptions[this.data.sortIndex].value;
      const result = await api.searchQuestions({
        keyword,
        sortBy: currentSort,
        page: 1,
        pageSize: 20,
        status: 'all'
      });
      const list = (result.items || []).filter((item) => item.status !== 'deleted').map((item) => ({
        ...item,
        titleSegments: highlightText(item.title, keyword),
        contentSegments: highlightText(item.content, keyword),
        updatedAtText: formatTime(item.updatedAt),
        difficultyText: this.formatDifficulty(item.difficulty)
      }));
      this.setData({
        list,
        resultMeta: {
          total: result.total || list.length,
          from: result.from || 'cloud'
        }
      });
      if (keyword) this.saveHistory(keyword);
    } catch (error) {
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
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
    this.handleSearch();
  },
  formatDifficulty(value) {
    const map = { easy: '简单', medium: '中等', hard: '困难' };
    return map[value] || '未设置';
  },
  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  }
});
