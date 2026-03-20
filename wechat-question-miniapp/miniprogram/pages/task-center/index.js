const api = require('../../utils/question');
const { formatTime } = require('../../utils');

const IMPORT_TASKS_KEY = 'question-import-task-receipts';

Page({
  data: {
    checking: true,
    isAdmin: false,
    admin: null,
    recentImportTasks: [],
    recentAuditLogs: [],
    reviewQueue: [],
    queueStats: {
      pending: 0,
      rejected: 0,
      published: 0,
      draft: 0
    },
    taskSourceLabel: '加载中',
    auditSourceLabel: '加载中'
  },
  async onShow() {
    this.loadCachedTasks();
    await this.bootstrap();
  },
  loadCachedTasks() {
    const recentImportTasks = (wx.getStorageSync(IMPORT_TASKS_KEY) || []).slice(0, 8).map((item) => ({
      ...item,
      timeText: item.createdAt ? formatTime(item.createdAt) : '--'
    }));
    this.setData({
      recentImportTasks,
      taskSourceLabel: recentImportTasks.length ? '本地缓存回执' : '暂无任务回执'
    });
  },
  async bootstrap() {
    this.setData({ checking: true });
    try {
      const info = await api.checkAdmin();
      if (!info.isAdmin) {
        this.setData({ isAdmin: false, admin: info.admin || null });
        return;
      }
      this.setData({ isAdmin: true, admin: info.admin || null });
      await Promise.all([
        this.loadOverview(),
        this.loadReviewQueue()
      ]);
    } catch (error) {
      wx.showToast({ title: '任务中心加载失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
  },
  async loadOverview() {
    try {
      const overview = await api.getAdminOverview();
      const recentImportTasks = (overview.recentImportTasks || []).map((item) => ({
        ...item,
        timeText: item.updatedAt ? formatTime(item.updatedAt) : '--',
        statusLabel: item.mode === 'preview' ? '已预检' : '已导入'
      }));
      const recentAuditLogs = (overview.recentAuditLogs || []).map((item) => ({
        ...item,
        timeText: item.createdAt ? formatTime(item.createdAt) : '--'
      }));
      this.setData({
        admin: overview.admin || this.data.admin,
        recentImportTasks: recentImportTasks.length ? recentImportTasks : this.data.recentImportTasks,
        recentAuditLogs,
        taskSourceLabel: recentImportTasks.length ? '云端 import_tasks' : this.data.taskSourceLabel,
        auditSourceLabel: recentAuditLogs.length ? '云端 audit_logs' : '暂无审计日志'
      });
    } catch (error) {
      this.setData({
        taskSourceLabel: this.data.recentImportTasks.length ? '本地缓存（云端概览不可用）' : '云端概览不可用',
        auditSourceLabel: '云端概览不可用'
      });
    }
  },
  async loadReviewQueue() {
    const result = await api.searchQuestions({
      keyword: '',
      management: true,
      status: 'all',
      includeDeleted: true,
      page: 1,
      pageSize: 100,
      sortBy: 'updatedAt'
    });
    const items = (result.items || []).map((item) => ({
      ...item,
      updatedAtText: formatTime(item.updatedAt),
      ownerTeamText: item.governance && item.governance.ownerTeam ? item.governance.ownerTeam : '未分配团队',
      ownerText: item.governance && item.governance.owner ? item.governance.owner : '未分配负责人',
      reviewStatusText: this.formatReview(item.reviewStatus),
      lifecycleText: this.formatLifecycle(item.lifecycleState),
      versionText: `v${item.version || 1}`
    }));
    const reviewQueue = items.filter((item) => {
      return item.reviewStatus === 'pending'
        || item.reviewStatus === 'rejected'
        || item.lifecycleState === 'review';
    }).slice(0, 12);

    this.setData({
      reviewQueue,
      queueStats: {
        pending: items.filter((item) => item.reviewStatus === 'pending').length,
        rejected: items.filter((item) => item.reviewStatus === 'rejected').length,
        published: items.filter((item) => item.lifecycleState === 'published').length,
        draft: items.filter((item) => item.lifecycleState === 'draft').length
      }
    });
  },
  formatReview(value) {
    return { approved: '审核通过', pending: '待审核', rejected: '已驳回' }[value] || '未设置';
  },
  formatLifecycle(value) {
    return { published: '已上线', review: '审核中', draft: '草稿中', archived: '已归档' }[value] || '未设置';
  },
  goImport() {
    wx.navigateTo({ url: '/pages/import/index' });
  },
  goList() {
    wx.navigateTo({ url: '/pages/list/index' });
  },
  goEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/edit/index?id=${id}` });
  }
});
