const api = require('../../utils/question');
const { formatTime } = require('../../utils');
const { hasPermission, syncAdminContext } = require('../../utils/permissions');
const { loadLocalReceipts, attachLocalReceiptHints } = require('../../utils/import-task');
const QUEUE_FILTERS = [
  { label: '全部待处理', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '已驳回', value: 'rejected' },
  { label: '审核中', value: 'review' }
];

Page({
  data: {
    checking: true,
    isAdmin: false,
    admin: null,
    recentImportTasks: [],
    recentAuditLogs: [],
    reviewQueue: [],
    allReviewQueue: [],
    queueFilters: QUEUE_FILTERS,
    activeQueueFilter: 'all',
    queueSummaryText: '待处理队列会优先展示待审核和已驳回题目。',
    canEdit: false,
    canApprove: false,
    canReject: false,
    canPublish: false,
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
    const recentImportTasks = loadLocalReceipts(8).map((item) => ({
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
      syncAdminContext(info);
      if (!info.isAdmin) {
        this.setData({ isAdmin: false, admin: info.admin || null });
        return;
      }
      const admin = info.admin || null;
      this.setData({
        isAdmin: true,
        admin,
        canEdit: hasPermission(admin, 'question.write'),
        canApprove: hasPermission(admin, 'review.approve'),
        canReject: hasPermission(admin, 'review.reject'),
        canPublish: hasPermission(admin, 'question.publish')
      });
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
      const recentImportTasks = attachLocalReceiptHints((overview.recentImportTasks || []).map((item) => ({
        ...item,
        timeText: item.updatedAt ? formatTime(item.updatedAt) : '--',
        statusLabel: item.mode === 'preview' ? '已预检' : '已导入'
      })));
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
      reviewerText: item.governance && item.governance.reviewer ? item.governance.reviewer : '待分配审核人',
      reviewCommentText: item.governance && item.governance.reviewComment ? item.governance.reviewComment : '暂无审核备注',
      reviewStatusText: this.formatReview(item.reviewStatus),
      lifecycleText: this.formatLifecycle(item.lifecycleState),
      versionText: `v${item.version || 1}`,
      canApprove: this.data.canApprove && item.status !== 'deleted' && item.reviewStatus !== 'approved',
      canReject: this.data.canReject && item.status !== 'deleted' && item.reviewStatus !== 'rejected',
      canPublish: this.data.canPublish && item.status !== 'deleted' && item.reviewStatus === 'approved' && item.status !== 'published',
      canEdit: this.data.canEdit,
      queueBucket: this.getQueueBucket(item)
    }));
    const actionableQueue = items.filter((item) => item.queueBucket !== 'ignore');

    this.setData({
      allReviewQueue: actionableQueue,
      queueStats: {
        pending: items.filter((item) => item.reviewStatus === 'pending').length,
        rejected: items.filter((item) => item.reviewStatus === 'rejected').length,
        published: items.filter((item) => item.lifecycleState === 'published').length,
        draft: items.filter((item) => item.lifecycleState === 'draft').length
      }
    });
    this.applyQueueFilter();
  },
  getQueueBucket(item = {}) {
    if (item.reviewStatus === 'pending') return 'pending';
    if (item.reviewStatus === 'rejected') return 'rejected';
    if (item.lifecycleState === 'review') return 'review';
    return 'ignore';
  },
  applyQueueFilter() {
    const activeQueueFilter = this.data.activeQueueFilter || 'all';
    const filtered = (this.data.allReviewQueue || []).filter((item) => {
      if (activeQueueFilter === 'all') return true;
      return item.queueBucket === activeQueueFilter;
    }).slice(0, 12);
    this.setData({
      reviewQueue: filtered,
      queueSummaryText: this.buildQueueSummary(activeQueueFilter, filtered.length)
    });
  },
  buildQueueSummary(filter = 'all', count = 0) {
    const base = {
      all: '聚合待审核、已驳回和审核中的题目，适合作为每日工作台默认视图。',
      pending: '优先处理待审核题目，适合现场演示“审核通过 / 驳回”的即时动作。',
      rejected: '聚焦已驳回题目，方便继续修订、补充说明后重新流转。',
      review: '展示审核中但尚未完成闭环的题目，适合讲跨角色协作。'
    }[filter] || '按筛选查看当前工作台队列。';
    return `${base} 当前展示 ${count} 条。`;
  },
  onTapQueueFilter(e) {
    this.setData({ activeQueueFilter: e.currentTarget.dataset.value || 'all' });
    this.applyQueueFilter();
  },
  formatReview(value) {
    return { approved: '审核通过', pending: '待审核', rejected: '已驳回' }[value] || '未设置';
  },
  formatLifecycle(value) {
    return { published: '已上线', review: '审核中', draft: '草稿中', archived: '已归档' }[value] || '未设置';
  },
  async applyReviewAction(id, transform, successTitle) {
    try {
      this.setData({ checking: true });
      const detail = await api.getQuestionDetail(id, { includeDeleted: true });
      if (!detail) {
        wx.showToast({ title: '题目不存在', icon: 'none' });
        return;
      }
      const next = transform(detail);
      await api.saveQuestion(next);
      wx.showToast({ title: successTitle, icon: 'success' });
      await this.loadReviewQueue();
      await this.loadOverview();
    } catch (error) {
      wx.showToast({ title: error && error.message ? error.message : '操作失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
  },
  handleApprove(e) {
    const { id } = e.currentTarget.dataset;
    this.applyReviewAction(id, (detail) => ({
      ...detail,
      id,
      status: detail.status === 'draft' ? 'review' : detail.status,
      reviewStatus: 'approved',
      reviewer: (detail.governance && detail.governance.reviewer) || '任务中心快捷审核',
      reviewComment: '任务中心快捷审核通过',
      changeReason: 'quick approve from task center'
    }), '已审核通过');
  },
  handleReject(e) {
    const { id } = e.currentTarget.dataset;
    this.applyReviewAction(id, (detail) => ({
      ...detail,
      id,
      status: detail.status === 'published' ? 'review' : detail.status,
      reviewStatus: 'rejected',
      reviewer: (detail.governance && detail.governance.reviewer) || '任务中心快捷审核',
      reviewComment: '任务中心快捷驳回，待继续修订',
      changeReason: 'quick reject from task center'
    }), '已驳回');
  },
  handlePublish(e) {
    const { id } = e.currentTarget.dataset;
    this.applyReviewAction(id, (detail) => ({
      ...detail,
      id,
      status: 'published',
      reviewStatus: 'approved',
      reviewer: (detail.governance && detail.governance.reviewer) || '任务中心快捷发布',
      reviewComment: '任务中心快捷发布',
      changeReason: 'quick publish from task center'
    }), '已发布');
  },
  goImport() {
    wx.navigateTo({ url: '/pages/import/index' });
  },
  continueImportTask(e) {
    const { receiptId } = e.currentTarget.dataset;
    const url = receiptId ? `/pages/import/index?receiptId=${receiptId}` : '/pages/import/index';
    wx.navigateTo({ url });
  },
  goList() {
    wx.navigateTo({ url: '/pages/list/index' });
  },
  goEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/edit/index?id=${id}` });
  }
});
