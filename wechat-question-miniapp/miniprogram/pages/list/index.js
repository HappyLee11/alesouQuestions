const api = require('../../utils/question');
const { formatTime } = require('../../utils');

const FILTERS = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' },
  { label: '已归档', value: 'deleted' }
];

Page({
  data: {
    keyword: '',
    list: [],
    loading: false,
    filters: FILTERS,
    currentFilter: 'all'
  },
  onShow() {
    this.loadData();
  },
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  onTapFilter(e) {
    this.setData({ currentFilter: e.currentTarget.dataset.value });
    this.loadData();
  },
  async loadData() {
    this.setData({ loading: true });
    try {
      const result = await api.searchQuestions({
        keyword: this.data.keyword,
        sortBy: 'updatedAt',
        status: this.data.currentFilter,
        includeDeleted: true,
        management: true,
        page: 1,
        pageSize: 100
      });
      const list = (result.items || []).map((item) => ({
        ...item,
        updatedAtText: formatTime(item.updatedAt),
        statusText: this.formatStatus(item.status),
        difficultyText: this.formatDifficulty(item.difficulty)
      }));
      this.setData({ list });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  formatStatus(value) {
    return { published: '已发布', draft: '草稿', deleted: '已归档' }[value] || '未设置';
  },
  formatDifficulty(value) {
    return { easy: '简单', medium: '中等', hard: '困难' }[value] || '未设置';
  },
  goEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/edit/index?id=${id}` });
  },
  async handleDelete(e) {
    const { id } = e.currentTarget.dataset;
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '归档题目',
        content: '归档后题目不会出现在普通搜索中，但可在后台恢复，适合更安全的删除演示。',
        success: (res) => resolve(!!res.confirm)
      });
    });
    if (!confirmed) return;
    try {
      await api.deleteQuestion({ id, restore: false, reason: '后台手动归档' });
      wx.showToast({ title: '已归档', icon: 'success' });
      this.loadData();
    } catch (error) {
      wx.showToast({ title: '归档失败', icon: 'none' });
    }
  },
  async handleRestore(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await api.deleteQuestion({ id, restore: true });
      wx.showToast({ title: '已恢复', icon: 'success' });
      this.loadData();
    } catch (error) {
      wx.showToast({ title: '恢复失败', icon: 'none' });
    }
  }
});
