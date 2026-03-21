const api = require('../../utils/question');
const { formatTime } = require('../../utils');
const { buildAdminSeedText, buildCollectionChecklistText } = require('../../utils/bootstrap');
const { loadLocalReceipts, attachLocalReceiptHints } = require('../../utils/import-task');

Page({
  data: {
    checking: true,
    isAdmin: false,
    openid: '',
    admin: null,
    permissionGroups: [],
    recentAuditLogs: [],
    stats: {
      total: 0,
      published: 0,
      draft: 0,
      review: 0,
      deleted: 0,
      approved: 0,
      pending: 0,
      rejected: 0
    },
    moduleCards: [
      { title: '题目列表', desc: '筛选、搜索、归档与恢复，展示生命周期状态。', action: 'list' },
      { title: '新增 / 编辑', desc: '维护题干、答案、负责人、审核备注和版本快照。', action: 'create' },
      { title: '批量导入', desc: '本地暂存 → 云端预检 → 正式导入，适合讲治理链路。', action: 'import' },
      { title: '任务中心', desc: '聚合审核队列、导入任务和审计轨迹，更像真实运营工作台。', action: 'taskCenter' }
    ],
    governanceChecklist: [
      '管理员权限校验',
      '生命周期 / 审核态统计',
      '题目归档与恢复',
      '版本快照与变更原因',
      '导入任务批次与来源信息',
      '列表快捷审核 / 发布动作',
      '审计日志与角色能力概览'
    ],
    recentImportTasks: [],
    riskAlerts: [],
    acceptanceItems: [],
    acceptanceSummaryText: '正在生成后台收口提示。',
    taskSourceLabel: '本地缓存'
  },
  async onShow() {
    this.loadRecentImportTasks();
    await this.checkAccess();
  },
  formatPermission(permission = '') {
    return permission
      .split('.')
      .map((part) => part.replace(/^[a-z]/, (letter) => letter.toUpperCase()))
      .join(' / ');
  },
  groupPermissions(permissions = []) {
    const groups = {};
    permissions.forEach((permission) => {
      const prefix = String(permission || '').split('.')[0] || 'general';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push({ key: permission, label: this.formatPermission(permission) });
    });
    return Object.keys(groups).map((key) => ({
      key,
      label: key.replace(/^[a-z]/, (letter) => letter.toUpperCase()),
      items: groups[key]
    }));
  },
  loadRecentImportTasks() {
    const recentImportTasks = loadLocalReceipts(3).map((item) => ({
      ...item,
      timeText: item.createdAt ? formatTime(item.createdAt) : '--'
    }));
    this.setData({ recentImportTasks, taskSourceLabel: recentImportTasks.length ? '本地缓存' : '暂无任务' });
    this.updateAdminInsights();
  },
  getLatestImportTask(predicate) {
    return (this.data.recentImportTasks || []).find((item) => predicate(item)) || null;
  },
  buildRiskAlerts() {
    const { stats, recentImportTasks, recentAuditLogs } = this.data;
    const alerts = [];
    const latestInvalidTask = this.getLatestImportTask((item) => Number(item.invalid || 0) > 0);
    const latestWarningTask = this.getLatestImportTask((item) => Number(item.invalid || 0) === 0 && Number(item.warnings || 0) > 0);
    const latestResumableTask = this.getLatestImportTask((item) => !!item.resumable);

    if (stats.pending) {
      alerts.push({
        key: 'pending',
        title: '待审核题目仍有积压',
        desc: `后台当前还有 ${stats.pending} 条待审核题目，建议先去任务中心处理。`,
        cta: '去审核',
        action: 'pending'
      });
    }
    if (latestInvalidTask) {
      alerts.push({
        key: 'invalid-import',
        title: '最近导入任务仍有错误',
        desc: `${latestInvalidTask.taskName || latestInvalidTask.batchId || '最近任务'} 还剩 ${latestInvalidTask.invalid} 条错误记录。`,
        cta: latestInvalidTask.resumable ? '继续修正' : '查看风险',
        action: latestInvalidTask.resumable ? 'continueImport' : 'importWarning',
        receiptId: latestInvalidTask.localReceiptId || ''
      });
    } else if (latestResumableTask) {
      alerts.push({
        key: 'resumable-import',
        title: '最近导入任务可继续处理',
        desc: `${latestResumableTask.taskName || latestResumableTask.batchId || '最近任务'} 可以直接恢复到当前暂存区。`,
        cta: '继续处理',
        action: 'continueImport',
        receiptId: latestResumableTask.localReceiptId || ''
      });
    } else if (latestWarningTask) {
      alerts.push({
        key: 'warning-import',
        title: '最近导入任务仍带预警',
        desc: `${latestWarningTask.taskName || latestWarningTask.batchId || '最近任务'} 还有 ${latestWarningTask.warnings} 条预警。`,
        cta: '查看预警',
        action: 'importWarning'
      });
    }
    if (!recentAuditLogs.length) {
      alerts.push({
        key: 'audit',
        title: '最近缺少审计轨迹',
        desc: '后台首页目前看不到最近操作日志，验收讲闭环时会偏弱。',
        cta: '去任务中心',
        action: 'taskCenter'
      });
    }
    return alerts.slice(0, 3);
  },
  buildAcceptanceState() {
    const { stats, recentImportTasks, recentAuditLogs } = this.data;
    const invalidTaskCount = (recentImportTasks || []).filter((item) => Number(item.invalid || 0) > 0).length;
    const warningTaskCount = (recentImportTasks || []).filter((item) => Number(item.invalid || 0) === 0 && Number(item.warnings || 0) > 0).length;
    const acceptanceItems = [
      {
        key: 'pending',
        title: '待审核队列',
        passed: stats.pending === 0,
        valueText: stats.pending === 0 ? '已清零' : `${stats.pending} 条待处理`
      },
      {
        key: 'import-invalid',
        title: '导入错误',
        passed: invalidTaskCount === 0,
        valueText: invalidTaskCount === 0 ? '无硬阻塞' : `${invalidTaskCount} 条任务有错误`
      },
      {
        key: 'import-warning',
        title: '导入预警',
        passed: warningTaskCount === 0,
        valueText: warningTaskCount === 0 ? '风险可控' : `${warningTaskCount} 条任务预警`
      },
      {
        key: 'audit',
        title: '审计轨迹',
        passed: recentAuditLogs.length > 0,
        valueText: recentAuditLogs.length ? `${recentAuditLogs.length} 条日志` : '暂无日志'
      }
    ];
    const passedCount = acceptanceItems.filter((item) => item.passed).length;
    return {
      acceptanceItems,
      acceptanceSummaryText: passedCount === acceptanceItems.length
        ? '后台首页当前已满足主要收口条件，可继续做最终演示。'
        : `后台首页收口项已完成 ${passedCount}/${acceptanceItems.length}，建议优先处理未通过项。`
    };
  },
  updateAdminInsights() {
    const acceptanceState = this.buildAcceptanceState();
    this.setData({
      riskAlerts: this.buildRiskAlerts(),
      acceptanceItems: acceptanceState.acceptanceItems,
      acceptanceSummaryText: acceptanceState.acceptanceSummaryText
    });
  },
  navigateTaskCenter(params = {}) {
    const query = Object.keys(params)
      .filter((key) => params[key])
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    wx.navigateTo({ url: `/pages/task-center/index${query ? `?${query}` : ''}` });
  },
  handleAlertAction(e) {
    const { action, receiptId } = e.currentTarget.dataset;
    if (action === 'pending') return this.navigateTaskCenter({ queueFilter: 'pending' });
    if (action === 'importWarning') return this.navigateTaskCenter({ importTaskFilter: 'warning' });
    if (action === 'continueImport') return this.continueImportTask({ currentTarget: { dataset: { receiptId } } });
    if (action === 'taskCenter') return this.goTaskCenter();
    return null;
  },
  async checkAccess() {
    this.setData({ checking: true });
    try {
      const info = await api.checkAdmin();
      getApp().globalData.isAdmin = info.isAdmin;
      this.setData({
        isAdmin: info.isAdmin,
        openid: info.openid,
        admin: info.admin
      });
      if (info.isAdmin) {
        await Promise.all([
          this.loadStats(),
          this.loadAdminOverview(info)
        ]);
      }
    } catch (error) {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
  },
  async loadAdminOverview(baseInfo = {}) {
    try {
      const overview = await api.getAdminOverview();
      const permissionGroups = this.groupPermissions((overview.admin && overview.admin.permissions) || []);
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
        openid: overview.openid || baseInfo.openid || this.data.openid,
        admin: overview.admin || baseInfo.admin || this.data.admin,
        permissionGroups,
        recentImportTasks: recentImportTasks.length ? recentImportTasks : this.data.recentImportTasks,
        recentAuditLogs,
        taskSourceLabel: recentImportTasks.length ? '云端 import_tasks' : this.data.taskSourceLabel
      });
      this.updateAdminInsights();
    } catch (error) {
      this.setData({
        permissionGroups: this.groupPermissions(((baseInfo.admin || this.data.admin) && (baseInfo.admin || this.data.admin).permissions) || []),
        taskSourceLabel: this.data.recentImportTasks.length ? '本地缓存（云端概览不可用）' : '云端概览不可用'
      });
      this.updateAdminInsights();
    }
  },
  async loadStats() {
    const result = await api.searchQuestions({
      keyword: '',
      management: true,
      status: 'all',
      includeDeleted: true,
      page: 1,
      pageSize: 100,
      sortBy: 'updatedAt'
    });
    const items = result.items || [];
    this.setData({
      stats: {
        total: items.length,
        published: items.filter((item) => item.lifecycleState === 'published').length,
        draft: items.filter((item) => item.lifecycleState === 'draft').length,
        review: items.filter((item) => item.lifecycleState === 'review').length,
        deleted: items.filter((item) => item.lifecycleState === 'archived' || item.status === 'deleted').length,
        approved: items.filter((item) => item.reviewStatus === 'approved').length,
        pending: items.filter((item) => item.reviewStatus === 'pending').length,
        rejected: items.filter((item) => item.reviewStatus === 'rejected').length
      }
    });
    this.updateAdminInsights();
  },
  onTapModule(e) {
    const { action } = e.currentTarget.dataset;
    if (action === 'list') return this.goList();
    if (action === 'import') return this.goImport();
    if (action === 'taskCenter') return this.goTaskCenter();
    return this.goCreate();
  },
  copyOpenid() {
    if (!this.data.openid) {
      wx.showToast({ title: '还没拿到 OPENID', icon: 'none' });
      return;
    }
    wx.setClipboardData({ data: this.data.openid });
  },
  copyAdminSeed() {
    wx.setClipboardData({ data: buildAdminSeedText(this.data.openid) });
  },
  copyCollectionChecklist() {
    wx.setClipboardData({ data: buildCollectionChecklistText() });
  },
  goList() {
    wx.navigateTo({ url: '/pages/list/index' });
  },
  goImport() {
    wx.navigateTo({ url: '/pages/import/index' });
  },
  continueImportTask(e) {
    const { receiptId } = e.currentTarget.dataset;
    const url = receiptId ? `/pages/import/index?receiptId=${receiptId}` : '/pages/import/index';
    wx.navigateTo({ url });
  },
  goTaskCenter() {
    wx.navigateTo({ url: '/pages/task-center/index' });
  },
  goCreate() {
    wx.navigateTo({ url: '/pages/edit/index' });
  }
});
