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

const AUDIT_FILTERS = [
  { label: '全部日志', value: 'all' },
  { label: '导入相关', value: 'import' },
  { label: '审核发布', value: 'review' },
  { label: '题目变更', value: 'question' }
];

Page({
  data: {
    checking: true,
    isAdmin: false,
    admin: null,
    recentImportTasks: [],
    displayImportTasks: [],
    recentAuditLogs: [],
    displayAuditLogs: [],
    reviewQueue: [],
    allReviewQueue: [],
    queueFilters: QUEUE_FILTERS,
    activeQueueFilter: 'all',
    queueSummaryText: '待处理队列会优先展示待审核和已驳回题目。',
    importTaskFilters: IMPORT_TASK_FILTERS,
    activeImportTaskFilter: 'all',
    importTaskSummaryText: '最近导入任务会聚合本地缓存与云端任务概览。',
    auditFilters: AUDIT_FILTERS,
    activeAuditFilter: 'all',
    auditSummaryText: '最近审计轨迹会串起导入任务、审核动作与题目维护。',
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
      invalid: 0,
      imported: 0
    },
    focusCards: [],
    todoCards: [],
    riskAlerts: [],
    acceptanceChecklist: [],
    acceptanceSummaryText: '正在生成验收收口建议。',
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
  getAuditBucket(item = {}) {
    const action = String(item.action || '').toLowerCase();
    const entityType = String(item.entityType || '').toLowerCase();
    if (/import/.test(action) || /import/.test(entityType) || /task/.test(entityType)) return 'import';
    if (/review|approve|reject|publish/.test(action)) return 'review';
    return 'question';
  },
  findAuditTaskMatch(item = {}, tasks = this.data.recentImportTasks || []) {
    const candidates = [
      item.taskId,
      item.batchId,
      item.entityId,
      item.entityTitle,
      item.summary
    ].filter(Boolean).map((value) => String(value));
    return (tasks || []).find((task) => {
      const taskValues = [task.taskId, task.batchId, task.taskName].filter(Boolean).map((value) => String(value));
      return candidates.some((candidate) => taskValues.some((taskValue) => candidate.includes(taskValue) || taskValue.includes(candidate)));
    }) || null;
  },
  normalizeAuditLog(item = {}, tasks = this.data.recentImportTasks || []) {
    const matchedTask = this.findAuditTaskMatch(item, tasks);
    const auditBucket = this.getAuditBucket(item);
    const isQuestionEntity = /question/.test(String(item.entityType || '').toLowerCase());
    return {
      ...item,
      timeText: item.timeText || (item.createdAt ? formatTime(item.createdAt) : '--'),
      auditBucket,
      matchedTaskLabel: matchedTask ? (matchedTask.taskName || matchedTask.batchId || matchedTask.taskId || '--') : '',
      matchedTaskReceiptId: matchedTask ? (matchedTask.localReceiptId || '') : '',
      actionLabel: matchedTask
        ? (matchedTask.localReceiptId ? '继续导入' : '查看导入任务')
        : (isQuestionEntity ? '去编辑页' : auditBucket === 'review' ? '看审核队列' : '回任务中心'),
      actionTarget: matchedTask
        ? (matchedTask.localReceiptId ? 'continue-import' : 'filter-import')
        : (isQuestionEntity ? 'edit-question' : auditBucket === 'review' ? 'queue-pending' : 'queue-all')
    };
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
      const mergedTasks = recentImportTasks.length ? recentImportTasks : this.data.recentImportTasks;
      const recentAuditLogs = (overview.recentAuditLogs || []).map((item) => this.normalizeAuditLog({
        ...item,
        timeText: item.createdAt ? formatTime(item.createdAt) : '--'
      }, mergedTasks));
      this.setData({
        admin: overview.admin || this.data.admin,
        recentImportTasks: mergedTasks,
        recentAuditLogs,
        taskSourceLabel: recentImportTasks.length ? '云端 import_tasks' : this.data.taskSourceLabel,
        auditSourceLabel: recentAuditLogs.length ? '云端 audit_logs' : '暂无审计日志'
      });
      this.updateImportTaskState(mergedTasks, false);
      this.updateAuditLogState(recentAuditLogs, false);
      this.updateWorkbenchInsights();
    } catch (error) {
      this.setData({
        taskSourceLabel: this.data.recentImportTasks.length ? '本地缓存（云端概览不可用）' : '云端概览不可用',
        auditSourceLabel: '云端概览不可用'
      });
      this.updateAuditLogState(this.data.recentAuditLogs, false);
      this.updateWorkbenchInsights();
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
    this.updateWorkbenchInsights();
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
    this.updateWorkbenchInsights();
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
  buildAuditSummary(filter = 'all', count = 0) {
    const base = {
      all: '把导入、审核、题目维护日志放在一起，适合讲完整责任链。',
      import: '聚焦导入预检、导入执行和任务回执，可直接回到具体任务。',
      review: '聚焦审核通过、驳回、发布动作，适合说明审核闭环。',
      question: '聚焦题目编辑、维护与归档等内容变更日志。'
    }[filter] || '按筛选查看最近审计轨迹。';
    return `${base} 当前展示 ${count} 条。`;
  },
  buildNextActionText() {
    const { queueStats, importTaskStats } = this.data;
    if (queueStats.pending) {
      return `当前最优先动作：先处理 ${queueStats.pending} 条待审核题目，再回头看导入任务。`;
    }
    if (importTaskStats.invalid) {
      return `当前最优先动作：最近有 ${importTaskStats.invalid} 条导入任务仍含错误记录，建议先回到导入页修正。`;
    }
    if (importTaskStats.resumable) {
      return `当前最优先动作：有 ${importTaskStats.resumable} 条导入任务可继续处理，适合直接回到导入页完成闭环。`;
    }
    if (queueStats.rejected) {
      return `当前最优先动作：修订 ${queueStats.rejected} 条已驳回题目，推动它们重新进入审核流。`;
    }
    if (importTaskStats.warnings) {
      return `当前最优先动作：最近仍有 ${importTaskStats.warnings} 条导入任务带预警，建议补齐治理字段后再验收。`;
    }
    return '当前没有明显阻塞项，可继续回顾最近导入任务和审计轨迹。';
  },
  getLatestImportTask(predicate) {
    return (this.data.recentImportTasks || []).find((item) => predicate(item)) || null;
  },
  buildTodoCards() {
    const { queueStats, canEdit, canApprove, canReject, canPublish } = this.data;
    const latestResumableTask = this.getLatestImportTask((item) => item.resumable);
    const latestInvalidTask = this.getLatestImportTask((item) => item.invalid > 0);
    const latestWarningTask = this.getLatestImportTask((item) => item.invalid === 0 && item.warnings > 0);
    const canExecuteQueue = canEdit || canApprove || canReject || canPublish;
    const cards = [];

    if (queueStats.pending && canExecuteQueue) {
      cards.push({
        key: 'pending',
        title: '先清待审核题目',
        desc: `当前还有 ${queueStats.pending} 条待审核题目，适合作为今天的第一优先级。`,
        cta: '去审核',
        action: 'queue-pending',
        tone: 'primary'
      });
    }

    if (latestInvalidTask) {
      cards.push({
        key: 'import-invalid',
        title: '修正导入硬阻塞',
        desc: `${latestInvalidTask.taskName || latestInvalidTask.batchId || '最近任务'} 仍有 ${latestInvalidTask.invalid} 条错误记录。`,
        cta: latestInvalidTask.resumable ? '回导入页修正' : '查看风险',
        action: latestInvalidTask.resumable ? 'continue-import' : 'import-warning',
        receiptId: latestInvalidTask.localReceiptId || '',
        tone: 'danger'
      });
    } else if (latestResumableTask) {
      cards.push({
        key: 'resume-import',
        title: '继续导入闭环',
        desc: `${latestResumableTask.taskName || latestResumableTask.batchId || '最近任务'} 可直接恢复到暂存区继续处理。`,
        cta: '继续处理',
        action: 'continue-import',
        receiptId: latestResumableTask.localReceiptId || '',
        tone: 'success'
      });
    }

    if (queueStats.rejected && canEdit) {
      cards.push({
        key: 'rejected',
        title: '回看已驳回题目',
        desc: `当前还有 ${queueStats.rejected} 条驳回项待修订，建议尽快回流。`,
        cta: '去修订',
        action: 'queue-rejected',
        tone: 'warning'
      });
    }

    if (!latestInvalidTask && latestWarningTask) {
      cards.push({
        key: 'import-warning',
        title: '消化导入预警',
        desc: `${latestWarningTask.taskName || latestWarningTask.batchId || '最近任务'} 仍带 ${latestWarningTask.warnings} 条预警。`,
        cta: '查看预警',
        action: 'import-warning',
        tone: 'warning'
      });
    }

    if (!cards.length) {
      cards.push({
        key: 'overview',
        title: '进入日常巡检模式',
        desc: '当前没有明显阻塞，可继续回顾最近导入任务、审计轨迹和已发布内容。',
        cta: '看后台总览',
        action: 'admin',
        tone: 'neutral'
      });
    }

    return cards.slice(0, 4);
  },
  buildRiskAlerts() {
    const { queueStats, importTaskStats, recentAuditLogs, canApprove, canReject, canPublish, canEdit } = this.data;
    const alerts = [];

    if (queueStats.pending) {
      alerts.push({
        key: 'pending-backlog',
        title: '审核队列仍有积压',
        desc: `待审核 ${queueStats.pending} 条，若不先处理会直接影响验收节奏。`,
        tone: 'danger',
        cta: '去审核',
        action: 'queue-pending'
      });
    }

    if (importTaskStats.invalid) {
      alerts.push({
        key: 'import-invalid',
        title: '导入链路存在硬阻塞',
        desc: `最近 ${importTaskStats.invalid} 条导入任务含错误记录，当前不适合直接验收收口。`,
        tone: 'danger',
        cta: '看风险',
        action: 'import-warning'
      });
    }

    if (queueStats.rejected) {
      alerts.push({
        key: 'rejected-loop',
        title: '驳回项尚未回流',
        desc: `还有 ${queueStats.rejected} 条题目停留在驳回态，需继续修订后回到审核流。`,
        tone: 'warning',
        cta: '去修订',
        action: 'queue-rejected'
      });
    }

    if (!recentAuditLogs.length) {
      alerts.push({
        key: 'audit-missing',
        title: '最近缺少审计轨迹',
        desc: '当前看不到最近操作日志，讲治理闭环时可追溯性会偏弱。',
        tone: 'warning',
        cta: '看后台总览',
        action: 'admin'
      });
    }

    if (!canEdit && !canApprove && !canReject && !canPublish) {
      alerts.push({
        key: 'permission-limited',
        title: '当前角色偏只读',
        desc: '你能看到任务中心，但缺少题目维护或审核动作权限，现场处理会受限。',
        tone: 'neutral',
        cta: '看权限',
        action: 'admin'
      });
    }

    if (!alerts.length) {
      alerts.push({
        key: 'healthy',
        title: '当前风险可控',
        desc: '审核、导入与审计轨迹都没有明显阻塞，适合进入最终验收收口。',
        tone: 'success',
        cta: '继续巡检',
        action: 'queue-all'
      });
    }

    return alerts.slice(0, 4);
  },
  buildAcceptanceState() {
    const { queueStats, importTaskStats, recentAuditLogs, canEdit, canApprove, canReject, canPublish } = this.data;
    const hasExecutionPermission = canEdit || canApprove || canReject || canPublish;
    const checklist = [
      {
        key: 'pending',
        title: '待审核题目已清零',
        passed: queueStats.pending === 0,
        valueText: queueStats.pending === 0 ? '已清零' : `剩余 ${queueStats.pending} 条`,
        desc: queueStats.pending === 0 ? '审核入口没有堆积，可继续下一步收口。' : '建议先处理待审核队列，再做最终验收。',
        action: 'queue-pending'
      },
      {
        key: 'rejected',
        title: '驳回项已回流',
        passed: queueStats.rejected === 0,
        valueText: queueStats.rejected === 0 ? '无滞留项' : `剩余 ${queueStats.rejected} 条`,
        desc: queueStats.rejected === 0 ? '没有停留在返工态的内容。' : '仍有驳回项待修订，验收口径会被拉长。',
        action: 'queue-rejected'
      },
      {
        key: 'import-invalid',
        title: '导入任务无错误记录',
        passed: importTaskStats.invalid === 0,
        valueText: importTaskStats.invalid === 0 ? '已通过' : `${importTaskStats.invalid} 条任务有错误`,
        desc: importTaskStats.invalid === 0 ? '最近导入任务没有硬阻塞，可继续闭环。' : '请先修正错误记录，避免把脏数据带进正式验收。',
        action: 'import-warning'
      },
      {
        key: 'import-warning',
        title: '导入预警已收敛',
        passed: importTaskStats.warnings === 0,
        valueText: importTaskStats.warnings === 0 ? '预警可控' : `${importTaskStats.warnings} 条任务仍预警`,
        desc: importTaskStats.warnings === 0 ? '治理字段与映射风险已经收敛。' : '建议继续补齐治理默认值和映射说明。',
        action: 'import-warning'
      },
      {
        key: 'audit',
        title: '最近操作可追溯',
        passed: recentAuditLogs.length > 0,
        valueText: recentAuditLogs.length ? `${recentAuditLogs.length} 条日志` : '暂无日志',
        desc: recentAuditLogs.length ? '当前可以用审计轨迹说明责任链和闭环。' : '建议补充可追溯的操作记录后再做正式演示。',
        action: 'admin'
      },
      {
        key: 'permission',
        title: '当前角色具备执行权限',
        passed: hasExecutionPermission,
        valueText: hasExecutionPermission ? '可执行处理动作' : '仅查看',
        desc: hasExecutionPermission ? '当前账号可以直接完成题目维护或审核动作。' : '建议切换具备题目维护 / 审核权限的账号。',
        action: 'admin'
      }
    ];
    const passedCount = checklist.filter((item) => item.passed).length;
    const total = checklist.length;
    const summaryText = passedCount === total
      ? '当前工作台已满足主要验收条件，可直接进入最终演示或上线前收口。'
      : `当前验收项已完成 ${passedCount}/${total}，建议按卡片提示优先处理未通过项。`;

    return {
      checklist,
      summaryText
    };
  },
  updateWorkbenchInsights() {
    const { queueStats, importTaskStats } = this.data;
    const focusCards = [
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
        title: '导入风险任务',
        value: importTaskStats.invalid || importTaskStats.warnings,
        desc: importTaskStats.invalid
          ? '存在含错误记录的导入任务'
          : importTaskStats.warnings
            ? '仍有仅预警任务待排查'
            : '当前导入任务整体健康',
        tone: importTaskStats.invalid ? 'danger' : importTaskStats.warnings ? 'warning' : 'neutral'
      }
    ];
    const acceptanceState = this.buildAcceptanceState();

    this.setData({
      focusCards,
      todoCards: this.buildTodoCards(),
      riskAlerts: this.buildRiskAlerts(),
      acceptanceChecklist: acceptanceState.checklist,
      acceptanceSummaryText: acceptanceState.summaryText,
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
        warnings: list.filter((item) => item.invalid === 0 && item.warnings > 0).length,
        invalid: list.filter((item) => item.invalid > 0).length,
        imported: list.filter((item) => item.mode === 'import').length
      },
      importTaskSummaryText: this.buildImportTaskSummary(activeImportTaskFilter, displayImportTasks.length)
    });
    if (shouldUpdateFocusCards) this.updateWorkbenchInsights();
  },
  updateAuditLogState(logs = this.data.recentAuditLogs, shouldUpdateInsights = true) {
    const list = (logs || []).map((item) => this.normalizeAuditLog(item, this.data.recentImportTasks));
    const activeAuditFilter = this.data.activeAuditFilter || 'all';
    const displayAuditLogs = list.filter((item) => {
      if (activeAuditFilter === 'all') return true;
      return item.auditBucket === activeAuditFilter;
    });
    this.setData({
      recentAuditLogs: list,
      displayAuditLogs,
      auditSummaryText: this.buildAuditSummary(activeAuditFilter, displayAuditLogs.length)
    });
    if (shouldUpdateInsights) this.updateWorkbenchInsights();
  },
  applyEntryFilters() {
    const entryFilters = this.entryFilters || {};
    const nextQueueFilter = entryFilters.queueFilter || this.data.activeQueueFilter || 'all';
    const nextImportTaskFilter = entryFilters.importTaskFilter || this.data.activeImportTaskFilter || 'all';
    const nextAuditFilter = entryFilters.auditFilter || this.data.activeAuditFilter || 'all';
    this.setData({
      activeQueueFilter: nextQueueFilter,
      activeImportTaskFilter: nextImportTaskFilter,
      activeAuditFilter: nextAuditFilter
    });
    this.applyQueueFilter();
    this.updateImportTaskState(this.data.recentImportTasks);
    this.updateAuditLogState(this.data.recentAuditLogs);
  },
  onTapQueueFilter(e) {
    this.setData({ activeQueueFilter: e.currentTarget.dataset.value || 'all' });
    this.applyQueueFilter();
  },
  onTapImportTaskFilter(e) {
    this.setData({ activeImportTaskFilter: e.currentTarget.dataset.value || 'all' });
    this.updateImportTaskState(this.data.recentImportTasks);
  },
  onTapAuditFilter(e) {
    this.setData({ activeAuditFilter: e.currentTarget.dataset.value || 'all' });
    this.updateAuditLogState(this.data.recentAuditLogs);
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
  handleInsightAction(e) {
    const { action, receiptId } = e.currentTarget.dataset;
    if (action === 'queue-pending') {
      this.setData({ activeQueueFilter: 'pending' });
      return this.applyQueueFilter();
    }
    if (action === 'queue-rejected') {
      this.setData({ activeQueueFilter: 'rejected' });
      return this.applyQueueFilter();
    }
    if (action === 'queue-all') {
      this.setData({ activeQueueFilter: 'all' });
      return this.applyQueueFilter();
    }
    if (action === 'import-warning') {
      this.setData({ activeImportTaskFilter: 'warning' });
      return this.updateImportTaskState(this.data.recentImportTasks);
    }
    if (action === 'filter-import') {
      this.setData({ activeImportTaskFilter: 'all', activeAuditFilter: 'import' });
      this.updateImportTaskState(this.data.recentImportTasks, false);
      return this.updateAuditLogState(this.data.recentAuditLogs);
    }
    if (action === 'continue-import') {
      if (receiptId) {
        return this.continueImportTask({ currentTarget: { dataset: { receiptId } } });
      }
      return this.continueLatestImportTask();
    }
    if (action === 'edit-question') {
      const questionId = e.currentTarget.dataset.entityId;
      if (questionId) return this.goEdit({ currentTarget: { dataset: { id: questionId } } });
      return null;
    }
    if (action === 'admin') {
      return wx.navigateTo({ url: '/pages/admin/index' });
    }
    return null;
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
