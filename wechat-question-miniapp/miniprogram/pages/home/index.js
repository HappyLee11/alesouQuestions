const mock = require('../../utils/mock');
const api = require('../../utils/question');
const { syncAdminContext, hasAnyPermission } = require('../../utils/permissions');

const HISTORY_KEY = 'question-search-history';
const DIFFICULTY_LABELS = { easy: '简单', medium: '中等', hard: '困难' };

function uniqueList(list = []) {
  return Array.from(new Set(list.filter(Boolean)));
}

function normalizeImportTask(task = {}) {
  const warnings = Number(task.warnings || 0);
  const invalid = Number(task.invalid || 0);
  const resumable = !!task.resumable;
  const mode = task.mode || (task.statusLabel === '已导入' ? 'import' : 'preview');
  return {
    ...task,
    warnings,
    invalid,
    resumable,
    mode,
    taskStatusText: task.taskStatus || (mode === 'preview' ? 'staged' : 'imported'),
    riskText: invalid ? `存在 ${invalid} 条错误` : warnings ? `存在 ${warnings} 条预警` : '当前任务健康'
  };
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
    recentImportTask: null,
    todoCards: []
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
    if (recentImportTask && recentImportTask.invalid) {
      return `最近导入任务仍有 ${recentImportTask.invalid} 条错误，建议先修正再继续导入。`;
    }
    if (recentImportTask && recentImportTask.warnings) {
      return `最近导入任务存在 ${recentImportTask.warnings} 条预警，可先在任务中心排查。`;
    }
    if (recentImportTask && (recentImportTask.taskName || recentImportTask.batchId)) {
      return `最近一条导入任务是“${recentImportTask.taskName || recentImportTask.batchId}”，可继续跟进预检与导入结果。`;
    }
    return '后台入口已集中到首页，可直接进入任务中心、导入页和题目后台。';
  },
  buildTodoCards(stats = {}, recentImportTask = null, capability = {}) {
    const cards = [];
    if (stats.pending) {
      cards.push({
        key: 'pending',
        title: '优先处理待审核',
        desc: `当前有 ${stats.pending} 条待审核题目，适合先进入审核队列。`,
        action: 'pendingQueue',
        cta: '去审核',
        tone: 'primary'
      });
    }
    if (stats.rejected) {
      cards.push({
        key: 'rejected',
        title: '回看已驳回题目',
        desc: `当前有 ${stats.rejected} 条已驳回题目待修订。`,
        action: 'rejectedQueue',
        cta: '去修订',
        tone: 'warning'
      });
    }
    if (recentImportTask && recentImportTask.resumable) {
      cards.push({
        key: 'resume-import',
        title: '继续最近导入任务',
        desc: `${recentImportTask.taskName || recentImportTask.batchId || '最近任务'} 还可恢复到当前暂存区继续处理。`,
        action: 'continueImport',
        cta: '继续处理',
        tone: 'success'
      });
    } else if (recentImportTask && (recentImportTask.invalid || recentImportTask.warnings)) {
      cards.push({
        key: 'import-warning',
        title: '排查导入任务风险',
        desc: recentImportTask.invalid
          ? `最近任务仍有 ${recentImportTask.invalid} 条错误，需要先修正。`
          : `最近任务仍有 ${recentImportTask.warnings} 条预警，建议先查看。`,
        action: 'importWarnings',
        cta: '查看风险',
        tone: 'danger'
      });
    } else if (capability.canImport) {
      cards.push({
        key: 'new-import',
        title: '继续批量导入',
        desc: '当前没有明显阻塞的导入任务，可继续补充新批次题库。',
        action: 'import',
        cta: '去导入',
        tone: 'neutral'
      });
    }

    if (!cards.length) {
      cards.push({
        key: 'overview',
        title: '进入后台总览',
        desc: '当前没有紧急堆积项，可进入后台页继续查看全局情况。',
        action: 'admin',
        cta: '去后台',
        tone: 'neutral'
      });
    }
    return cards.slice(0, 3);
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
          todoCards: [],
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
      const recentImportTaskRaw = overview && overview.recentImportTasks && overview.recentImportTasks.length
        ? overview.recentImportTasks[0]
        : null;
      const recentImportTask = recentImportTaskRaw ? normalizeImportTask(recentImportTaskRaw) : null;
      const canImport = hasAnyPermission(admin, ['question.import']);
      const canManageQuestions = hasAnyPermission(admin, [
        'question.write',
        'review.approve',
        'review.reject',
        'question.publish'
      ]);

      this.setData({
        isAdmin: true,
        admin,
        canImport,
        canManageQuestions,
        recentImportTask,
        adminStats,
        adminSummaryText: this.buildAdminSummaryText(adminStats, recentImportTask),
        todoCards: this.buildTodoCards(adminStats, recentImportTask, { canImport, canManageQuestions })
      });
    } catch (error) {
      this.setData({
        isAdmin: false,
        admin: null,
        canImport: false,
        canManageQuestions: false,
        recentImportTask: null,
        adminSummaryText: '',
        todoCards: []
      });
    } finally {
      this.setData({ checkingAdmin: false });
    }
  },
  navigateTaskCenter(params = {}) {
    const query = Object.keys(params)
      .filter((key) => params[key])
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    wx.navigateTo({ url: `/pages/task-center/index${query ? `?${query}` : ''}` });
  },
  goTaskCenter() {
    this.navigateTaskCenter();
  },
  goPendingQueue() {
    this.navigateTaskCenter({ queueFilter: 'pending' });
  },
  goRejectedQueue() {
    this.navigateTaskCenter({ queueFilter: 'rejected' });
  },
  goImportWarnings() {
    this.navigateTaskCenter({ importTaskFilter: 'warning' });
  },
  goImport() {
    wx.navigateTo({ url: '/pages/import/index' });
  },
  continueRecentImportTask() {
    const task = this.data.recentImportTask;
    if (!task) return this.goImport();
    const url = task.localReceiptId ? `/pages/import/index?receiptId=${task.localReceiptId}` : '/pages/import/index';
    wx.navigateTo({ url });
  },
  handleTodoAction(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'pendingQueue') return this.goPendingQueue();
    if (action === 'rejectedQueue') return this.goRejectedQueue();
    if (action === 'importWarnings') return this.goImportWarnings();
    if (action === 'continueImport') return this.continueRecentImportTask();
    if (action === 'import') return this.goImport();
    if (action === 'admin') return this.goAdmin();
    return this.goTaskCenter();
  },
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' });
  },
  goList() {
    wx.navigateTo({ url: '/pages/list/index' });
  }
});
