const api = require('../../utils/question');
const { formatTime } = require('../../utils');

const FILTERS = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'review' },
  { label: '已归档', value: 'deleted' }
];

Page({
  data: {
    keyword: '',
    list: [],
    loading: false,
    filters: FILTERS,
    currentFilter: 'all',
    summaryCards: [
      { label: '总题目', value: '0', desc: '当前可管理记录' },
      { label: '审核中', value: '0', desc: '待继续处理' },
      { label: '已归档', value: '0', desc: '保留恢复能力' },
      { label: '最近更新', value: '--', desc: '方便演示时说明变更' }
    ]
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
  updateSummary(list = []) {
    const latest = list[0] && list[0].updatedAtText ? list[0].updatedAtText : '--';
    this.setData({
      summaryCards: [
        { label: '总题目', value: String(list.length), desc: '当前可管理记录' },
        { label: '审核中', value: String(list.filter((item) => item.lifecycleState === 'review' || item.reviewStatus === 'pending' || item.reviewStatusText === '待审核').length), desc: '待继续处理' },
        { label: '已归档', value: String(list.filter((item) => item.status === 'deleted').length), desc: '保留恢复能力' },
        { label: '最近更新', value: latest, desc: '方便演示时说明变更' }
      ]
    });
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
        difficultyText: this.formatDifficulty(item.difficulty),
        reviewStatusText: this.formatReview(item.reviewStatus),
        lifecycleText: this.formatLifecycle(item.lifecycleState),
        versionText: `v${item.version || 1}`,
        ownerTeamText: item.governance && item.governance.ownerTeam ? item.governance.ownerTeam : '未分配团队',
        ownerText: item.governance && item.governance.owner ? item.governance.owner : '未分配负责人',
        importBatchText: item.importMeta && item.importMeta.batchId ? item.importMeta.batchId : '--',
        importPositionText: item.importMeta ? `${item.importMeta.sheetName || '--'} / row ${item.importMeta.rowNumber || '--'}` : '--'
      }));
      this.setData({ list });
      this.updateSummary(list);
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  formatStatus(value) {
    return { published: '已发布', draft: '草稿', review: '待审核', deleted: '已归档' }[value] || '未设置';
  },
  formatDifficulty(value) {
    return { easy: '简单', medium: '中等', hard: '困难' }[value] || '未设置';
  },
  formatReview(value) {
    return { approved: '审核通过', pending: '待审核', rejected: '已驳回' }[value] || '未设置';
  },
  formatLifecycle(value) {
    return { published: '已上线', review: '审核中', draft: '草稿中', archived: '已归档' }[value] || '未设置';
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
        content: '归档后题目不会出现在普通搜索中，但会保留原状态、审核信息和版本记录，方便恢复。',
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