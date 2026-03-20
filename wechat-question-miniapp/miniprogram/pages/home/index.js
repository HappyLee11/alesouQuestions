const mock = require('../../utils/mock');

const HISTORY_KEY = 'question-search-history';
const DIFFICULTY_LABELS = { easy: '简单', medium: '中等', hard: '困难' };

function uniqueList(list = []) {
  return Array.from(new Set(list.filter(Boolean)));
}

Page({
  data: {
    keyword: '',
    hotTerms: [],
    history: [],
    subjects: [],
    sampleQuestions: []
  },
  onLoad() {
    const list = Array.isArray(mock.sampleQuestions) ? mock.sampleQuestions : [];
    const hotTerms = uniqueList(
      list.flatMap((item) => {
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 2) : [];
        return [item.subject].concat(tags);
      })
    ).slice(0, 8);

    const subjects = uniqueList(list.map((item) => item.subject)).slice(0, 8);
    const sampleQuestions = list.slice(0, 4).map((item) => ({
      _id: item._id,
      title: item.title,
      subject: item.subject,
      difficultyText: DIFFICULTY_LABELS[item.difficulty] || '未设置'
    }));

    this.setData({ hotTerms, subjects, sampleQuestions });
    this.loadHistory();
  },
  onShow() {
    this.loadHistory();
  },
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  submitSearch() {
    const keyword = (this.data.keyword || '').trim();
    const url = keyword
      ? `/pages/search/index?keyword=${encodeURIComponent(keyword)}`
      : '/pages/search/index';
    wx.navigateTo({ url });
  },
  onTapTerm(e) {
    const keyword = e.currentTarget.dataset.term || '';
    wx.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(keyword)}` });
  },
  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
  loadHistory() {
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    this.setData({ history });
  },
  clearHistory() {
    wx.removeStorageSync(HISTORY_KEY);
    this.setData({ history: [] });
  }
});
