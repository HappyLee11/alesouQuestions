const api = require('../../utils/question');
const { formatTime } = require('../../utils');

const IMPORT_TASKS_KEY = 'question-import-task-receipts';

Page({
  data: {
    checking: true,
    isAdmin: false,
    openid: '',
    admin: null,
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
      { title: '批量导入', desc: '本地暂存 → 云端预检 → 正式导入，适合讲治理链路。', action: 'import' }
    ],
    governanceChecklist: [
      '管理员权限校验',
      '生命周期 / 审核态统计',
      '题目归档与恢复',
      '版本快照与变更原因',
      '导入任务批次与来源信息',
      '列表快捷审核 / 发布动作'
    ],
    recentImportTasks: []
  },
  async onShow() {
    this.loadRecentImportTasks();
    await this.checkAccess();
  },
  loadRecentImportTasks() {
    const recentImportTasks = (wx.getStorageSync(IMPORT_TASKS_KEY) || []).slice(0, 3).map((item) => ({
      ...item,
      timeText: item.createdAt ? formatTime(item.createdAt) : '--'
    }));
    this.setData({ recentImportTasks });
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
        await this.loadStats();
      }
    } catch (error) {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
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
  },
  onTapModule(e) {
    const { action } = e.currentTarget.dataset;
    if (action === 'list') return this.goList();
    if (action === 'import') return this.goImport();
    return this.goCreate();
  },
  goList() {
    wx.navigateTo({ url: '/pages/list/index' });
  },
  goImport() {
    wx.navigateTo({ url: '/pages/import/index' });
  },
  goCreate() {
    wx.navigateTo({ url: '/pages/edit/index' });
  }
});