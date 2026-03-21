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

const IMPORT_TASK_FILTERS = [
  { label: '全部任务', value: 'all' },
  { label: '可继续处理', value: 'resumable' },
  { label: '有预警', value: 'warning' },
  { label: '已导入', value: 'import' }
];

Page({
  data: {
    checking: true,
    isAdmin: false,
    admin: null,
    recentImportTasks: [],
    displayImportTasks: [],
    recentAuditLogs: [],
    reviewQueue: [],
    allReviewQueue: [],
    queueFilters: QUEUE_FILTERS,
    activeQueueFilter: 'all',
    queueSummaryText: '待处理队列会优先展示待审核和已驳回题目。',
    importTaskFilters: IMPORT_TASK_FILTERS,
    activeImportTaskFilter: 'all',
    importTaskSummaryText: '最近导入任务会聚合本地缓存与云端任务概览。',
    nextActionText: '正在加载任务中心概览。',
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
    importTaskStats: {
      total: 0,
      resumable: 0,
      warnings: 0,
      imported: 0
    },
    focusCards: [],
    taskSourceLabel: '加载中',
    auditSourceLabel: '加载中'
  },
  onLoad(options = {}) {
    this.entryFilters = {
      queueFilter: options.queueFilter || '',
      importTaskFilter: options.importTaskFilter || ''
    };
  },
  async onShow() {
    this.loadCachedTasks();
    await this.bootstrap();
  },
  normalizeImportTask(item = {}) {
    const warnings = Number(item.warnings || 0);
    const invalid = Number(item.invalid || 0);
    const inserted = Number(item.inserted || 0);
    const updated = Number(item.updated || 0);
    const resumable = !!item.resumable;
    const mode = item.mode || (item.statusLabel === '已导入' ? 'import' : 'preview');
    return {
      ...item,
      warnings,
      invalid,
      inserted,
      updated,
      resumable,
      mode,
      timeText: item.timeText || (item.createdAt ? formatTime(item.createdAt) : '--'),
      statusLabel: item.statusLabel || (mode === 'preview' ? '已预检' : '已导入'),
      taskStatusText: item.taskStatus || (mode === 'preview' ? 'staged' : 'imported'),
      fileLabel: item.fileName || item.sourceRef || '--',
      riskLabel: invalid ? `存在 ${invalid} 条错误` : warnings ? `存在 ${warnings} 条预警` : '当前任务健康',
      sourceLabel: `${item.sourceType || '--'} / ${item.templateType || '--'}`,
      actionLabel: resumable ? '继续处理这批任务' : '打开导入页',
      taskBucket: this.getImportTaskBucket({ ...item, warnings, invalid, resumable, mode })
    };
  },
  getImportTaskBucket(item = {}) {
    if (item.resumable) return 'resumable';
    if (Number(item.warnings || 0) > 0 || Number(item.invalid || 0) > 0) return 'warning';
    if (item.mode === 'import') return 'import';
    return 'all';
  },
  loadCachedTasks() {
    const recentImportTasks = loadLocalReceipts(8).map((item) => this.normalizeImportTask(item));
    this.setData({
      recentImportTasks,
      taskSourceLabel: recentImportTasks.length ? '本地缓存回执' : '暂无任务回执'
    });
    this.updateImportTaskState(recentImportTasks, false);
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
      this.applyEntryFilters();
    } catch (error) {
      wx.showToast({ title: '任务中心加载失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
  },
  async loadOverview() {
    try {
      const overview = await api.getAdminOverview();
      const recentImportTasks = attachLocalReceiptHints((overview.recentImportTasks || []).map((item) => this.normalizeImportTask({
        ...item,
        timeText: item.updatedAt ? formatTime(item.updatedAt) : '--',
        statusLabel: item.mode === 'preview' ? '已预检' : '已导入'
      })));
      const recentAuditLogs = (overview.recentAuditLogs || []).map((item) => ({
        ...item,
        timeText: item.createdAt ? formatTime(item.createdAt) : '--'
      }));
      const mergedTasks = recentImportTasks.length ? recentImportTasks : this.data.recentImportTasks;
      this.setData({
        admin: overview.admin || this.data.admin,
        recentImportTasks: mergedTasks,
        recentAuditLogs,
        taskSourceLabel: recentImportTasks.length ? '云端 import_tasks' : this.data.taskSourceLabel,
        auditSourceLabel: recentAuditLogs.length ? '云端 audit_logs' : '暂无审计日志'
      });
      this.updateImportTaskState(mergedTasks, false);
    } catch (error) {
      this.setData({
        taskSourceLabel: this.data.recentImportTasks.length ? '本地缓存（云端概览不可用）' : '云端概览不可用',
        auditSourceLabel: '云端概览不可用'
      });
      this.updateFocusCards();
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
    this.updateFocusCards();
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
    this.updateFocusCards();
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
  buildImportTaskSummary(filter = 'all', count = 0) {
    const base = {
      all: '聚合最近预检、导入与本地回执任务，便于说明导入链路的来龙去脉。',
      resumable: '优先展示还可继续处理的导入任务，适合演示从任务中心回到导入页。',
      warning: '集中查看仍有错误或预警的任务，方便继续修正字段映射与治理默认值。',
      import: '聚焦已经导入完成的任务，可快速回顾批次与产出。'
    }[filter] || '按筛选查看最近导入任务。';
    return `${base} 当前展示 ${count} 条。`;
  },
  buildNextActionText() {
    const { queueStats, importTaskStats } = this.data;
    if (queueStats.pending) {
      return `当前最优先动作：先处理 ${queueStats.pending} 条待审核题目，再回头看导入任务。`;
    }
    if (importTaskStats.resumable) {
      return `当前最优先动作：有 ${importTaskStats.resumable} 条导入任务可继续处理，适合直接回到导入页完成闭环。`;
    }
    if (queueStats.rejected) {
      return `当前最优先动作：修订 ${queueStats.rejected} 条已驳回题目，推动它们重新进入审核流。`;
    }
    return '当前没有明显阻塞项，可继续回顾最近导入任务和审计轨迹。';
  },
  updateFocusCards() {
    const { queueStats, importTaskStats } = this.data;
    this.setData({
      focusCards: [
        {
          title: '待审核题目',
          value: queueStats.pending,
          desc: queueStats.pending ? '建议优先进入审核队列' : '当前没有待审核堆积',
          tone: queueStats.pending ? 'primary' : 'neutral'
        },
        {
          title: '已驳回待修订',
          value: queueStats.rejected,
          desc: queueStats.rejected ? '适合继续回到编辑页修订' : '当前没有被驳回项',
          tone: queueStats.rejected ? 'warning' : 'neutral'
        },
        {
          title: '可继续导入任务',
          value: importTaskStats.resumable,
          desc: importTaskStats.resumable ? '可从任务中心直接续跑导入流程' : '当前没有可恢复回执',
          tone: importTaskStats.resumable ? 'success' : 'neutral'
        },
        {
          title: '有预警的任务',
          value: importTaskStats.warnings,
          desc: importTaskStats.warnings ? '建议先修正文档或映射配置' : '当前任务整体健康',
          tone: importTaskStats.warnings ? 'danger' : 'neutral'
        }
      ],
      nextActionText: this.buildNextActionText()
    });
  },
  updateImportTaskState(tasks = this.data.recentImportTasks, shouldUpdateFocusCards = true) {
    const list = (tasks || []).map((item) => this.normalizeImportTask(item));
    const activeImportTaskFilter = this.data.activeImportTaskFilter || 'all';
    const displayImportTasks = list.filter((item) => {
      if (activeImportTaskFilter === 'all') return true;
      return item.taskBucket === activeImportTaskFilter;
    });
    this.setData({
      recentImportTasks: list,
      displayImportTasks,
      importTaskStats: {
        total: list.length,
        resumable: list.filter((item) => item.resumable).length,
        warnings: list.filter((item) => item.invalid > 0 || item.warnings > 0).length,
        imported: list.filter((item) => item.mode === 'import').length
      },
      importTaskSummaryText: this.buildImportTaskSummary(activeImportTaskFilter, displayImportTasks.length)
    });
    if (shouldUpdateFocusCards) this.updateFocusCards();
  },
  applyEntryFilters() {
    const entryFilters = this.entryFilters || {};
    const nextQueueFilter = entryFilters.queueFilter || this.data.activeQueueFilter || 'all';
    const nextImportTaskFilter = entryFilters.importTaskFilter || this.data.activeImportTaskFilter || 'all';
    this.setData({
      activeQueueFilter: nextQueueFilter,
      activeImportTaskFilter: nextImportTaskFilter
    });
    this.applyQueueFilter();
    this.updateImportTaskState(this.data.recentImportTasks);
  },
  onTapQueueFilter(e) {
    this.setData({ activeQueueFilter: e.currentTarget.dataset.value || 'all' });
    this.applyQueueFilter();
  },
  onTapImportTaskFilter(e) {
    this.setData({ activeImportTaskFilter: e.currentTarget.dataset.value || 'all' });
    this.updateImportTaskState(this.data.recentImportTasks);
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
  continueLatestImportTask() {
    const latest = (this.data.displayImportTasks && this.data.displayImportTasks[0]) || (this.data.recentImportTasks && this.data.recentImportTasks[0]);
    if (!latest) {
      wx.showToast({ title: '当前没有最近导入任务', icon: 'none' });
      return;
    }
    const url = latest.localReceiptId ? `/pages/import/index?receiptId=${latest.localReceiptId}` : '/pages/import/index';
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
