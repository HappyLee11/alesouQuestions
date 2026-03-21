const mock = require('../../utils/mock');
const api = require('../../utils/question');
const { syncAdminContext, hasAnyPermission } = require('../../utils/permissions');

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
    sampleQuestions: [],
    checkingAdmin: false,
    isAdmin: false,
    admin: null,
    canImport: false,
    canManageQuestions: false,
    adminSummaryText: '',
    adminStats: {
      pending: 0,
      rejected: 0,
      review: 0,
      published: 0
    },
    recentImportTask: null
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
    this.bootstrapAdmin();
  },
  onShow() {
    this.loadHistory();
    this.bootstrapAdmin();
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
  },
  buildAdminSummaryText(stats = {}, recentImportTask = null) {
    if (stats.pending) {
      return `当前有 ${stats.pending} 条待审核题目，建议先进入任务中心处理。`;
    }
    if (stats.rejected) {
      return `当前有 ${stats.rejected} 条已驳回题目待修订，可从首页直接回到工作台。`;
    }
    if (recentImportTask && (recentImportTask.taskName || recentImportTask.batchId)) {
      return `最近一条导入任务是“${recentImportTask.taskName || recentImportTask.batchId}”，可继续跟进预检与导入结果。`;
    }
    return '后台入口已集中到首页，可直接进入任务中心、导入页和题目后台。';
  },
  async bootstrapAdmin() {
    this.setData({ checkingAdmin: true });
    try {
      const info = await api.checkAdmin();
      syncAdminContext(info);
      if (!info.isAdmin) {
        this.setData({
          isAdmin: false,
          admin: null,
          canImport: false,
          canManageQuestions: false,
          recentImportTask: null,
          adminSummaryText: '',
          adminStats: {
            pending: 0,
            rejected: 0,
            review: 0,
            published: 0
          }
        });
        return;
      }

      const [overview, queueResult] = await Promise.all([
        api.getAdminOverview().catch(() => null),
        api.searchQuestions({
          keyword: '',
          management: true,
          status: 'all',
          includeDeleted: true,
          page: 1,
          pageSize: 40,
          sortBy: 'updatedAt'
        }).catch(() => ({ items: [] }))
      ]);

      const admin = (overview && overview.admin) || info.admin || null;
      const items = (queueResult.items || []).filter((item) => item.status !== 'deleted');
      const adminStats = {
        pending: items.filter((item) => item.reviewStatus === 'pending').length,
        rejected: items.filter((item) => item.reviewStatus === 'rejected').length,
        review: items.filter((item) => item.lifecycleState === 'review').length,
        published: items.filter((item) => item.lifecycleState === 'published').length
      };
      const recentImportTask = overview && overview.recentImportTasks && overview.recentImportTasks.length
        ? overview.recentImportTasks[0]
        : null;

      this.setData({
        isAdmin: true,
        admin,
        canImport: hasAnyPermission(admin, ['question.import']),
        canManageQuestions: hasAnyPermission(admin, [
          'question.write',
          'review.approve',
          'review.reject',
          'question.publish'
        ]),
        recentImportTask,
        adminStats,
        adminSummaryText: this.buildAdminSummaryText(adminStats, recentImportTask)
      });
    } catch (error) {
      this.setData({
        isAdmin: false,
        admin: null,
        canImport: false,
        canManageQuestions: false,
        recentImportTask: null,
        adminSummaryText: ''
      });
    } finally {
      this.setData({ checkingAdmin: false });
    }
  },
  goTaskCenter() {
    wx.navigateTo({ url: '/pages/task-center/index' });
  },
  goImport() {
    wx.navigateTo({ url: '/pages/import/index' });
  },
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' });
  },
  goList() {
    wx.navigateTo({ url: '/pages/list/index' });
  }
});
