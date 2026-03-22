const api = require('../../utils/question');
const { formatTime } = require('../../utils');
const { syncAdminContext, hasAnyPermission } = require('../../utils/permissions');

function buildGovernanceSnapshot(detail = {}) {
  const governance = detail.governance || {};
  const importMeta = detail.importMeta || null;
  const risks = [];

  if (!detail.answerSummary) {
    risks.push({ key: 'answerSummary', title: '缺答案摘要', desc: '建议补一句适合搜索结果展示的摘要。', tone: 'warning' });
  }
  if (!governance.ownerTeam) {
    risks.push({ key: 'ownerTeam', title: '缺归属团队', desc: '当前没有团队归口，治理链路不够完整。', tone: 'warning' });
  }
  if (!governance.owner) {
    risks.push({ key: 'owner', title: '缺负责人', desc: '建议补负责人，便于审核与后续收口。', tone: 'neutral' });
  }
  if ((detail.reviewStatus === 'pending' || detail.reviewStatus === 'approved' || detail.reviewStatus === 'rejected') && !governance.reviewer) {
    risks.push({ key: 'reviewer', title: '缺审核人', desc: '当前审核态已进入流程，建议补全审核人字段。', tone: 'warning' });
  }
  if (detail.reviewStatus === 'rejected' && !governance.reviewComment) {
    risks.push({ key: 'reviewComment', title: '缺驳回原因', desc: '已驳回题目应保留审核备注，方便继续修订。', tone: 'danger' });
  }
  if (importMeta && !governance.sourceRef) {
    risks.push({ key: 'sourceRef', title: '缺来源引用', desc: '当前题目来自导入链路，建议补来源引用方便追溯。', tone: 'warning' });
  }

  const acceptanceItems = [
    {
      key: 'base',
      title: '基础内容',
      passed: !!(detail.title && detail.content && detail.answer),
      valueText: detail.title && detail.content && detail.answer ? '完整' : '待补齐'
    },
    {
      key: 'search',
      title: '搜索呈现',
      passed: !!detail.answerSummary,
      valueText: detail.answerSummary ? '摘要就绪' : '缺摘要'
    },
    {
      key: 'governance',
      title: '治理归属',
      passed: !!(governance.ownerTeam && governance.owner),
      valueText: governance.ownerTeam && governance.owner ? '已指定' : '待补归属'
    },
    {
      key: 'review',
      title: '审核闭环',
      passed: detail.reviewStatus !== 'rejected' || !!governance.reviewComment,
      valueText: detail.reviewStatus !== 'rejected' || governance.reviewComment ? '可追溯' : '缺审核意见'
    }
  ];

  const blockerCount = risks.filter((item) => item.tone === 'danger').length;
  const warningCount = risks.length - blockerCount;
  const summaryText = blockerCount
    ? `当前有 ${blockerCount} 项关键阻塞，建议直接回编辑页修复。`
    : warningCount
      ? `当前没有硬阻塞，但仍有 ${warningCount} 项可优化信息。`
      : '当前题目已满足主要治理要求，可继续审核或作为演示样本展示。';

  return {
    governance,
    importMeta,
    risks: risks.slice(0, 5),
    acceptanceItems,
    summaryText
  };
}

Page({
  data: {
    id: '',
    detail: null,
    related: [],
    loading: true,
    showFullAnswer: false,
    showFullAnalysis: false,
    isAdmin: false,
    admin: null,
    canEdit: false,
    governanceSummaryText: '正在生成治理快照。',
    governanceRisks: [],
    acceptanceItems: [],
    governanceMeta: null,
    importMeta: null
  },
  async onLoad(options) {
    const id = options.id || '';
    this.setData({ id });
    await this.bootstrap();
  },
  async bootstrap() {
    try {
      const info = await api.checkAdmin();
      syncAdminContext(info);
      const admin = info.admin || null;
      this.setData({
        isAdmin: !!info.isAdmin,
        admin,
        canEdit: hasAnyPermission(admin, ['question.write', 'review.approve', 'review.reject', 'question.publish'])
      });
    } catch (error) {
      this.setData({ isAdmin: false, admin: null, canEdit: false });
    }
    await this.loadDetail();
  },
  async loadDetail() {
    try {
      const detail = await api.getQuestionDetail(this.data.id, { includeDeleted: this.data.isAdmin });
      if (detail) {
        detail.updatedAtText = formatTime(detail.updatedAt);
        detail.createdAtText = formatTime(detail.createdAt);
        detail.difficultyText = this.formatDifficulty(detail.difficulty);
        detail.statusText = this.formatStatus(detail.status);
        detail.reviewStatusText = this.formatReview(detail.reviewStatus);
        detail.lifecycleText = this.formatLifecycle(detail.lifecycleState || detail.status);
        detail.answerShort = detail.answerSummary || detail.answer || '暂无答案';
        detail.analysisShort = this.buildShortText(detail.analysis || '暂无解析', 66);
        detail.typeText = this.formatType(detail.type);
        detail.stats = [
          { label: '浏览', value: detail.viewCount || 0 },
          { label: '收藏', value: detail.favoriteCount || 0 },
          { label: '版本', value: detail.version || 1 },
          { label: '分值', value: detail.score || '--' }
        ];
        const snapshot = buildGovernanceSnapshot(detail);
        this.setData({
          governanceSummaryText: snapshot.summaryText,
          governanceRisks: snapshot.risks,
          acceptanceItems: snapshot.acceptanceItems,
          governanceMeta: snapshot.governance,
          importMeta: snapshot.importMeta
        });
      }
      this.setData({ detail, showFullAnswer: false, showFullAnalysis: false });
      await this.loadRelated(detail);
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  buildShortText(text = '', maxLength = 60) {
    const value = String(text || '').trim();
    if (!value) return '暂无内容';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}...`;
  },
  async loadRelated(detail) {
    if (!detail) return;

    const relatedMap = new Map();
    const relatedIds = Array.isArray(detail.relatedIds) ? detail.relatedIds.slice(0, 3) : [];
    if (relatedIds.length) {
      const relatedById = await Promise.all(
        relatedIds.map((id) => api.getQuestionDetail(id).catch(() => null))
      );
      relatedById.filter(Boolean).forEach((item) => {
        relatedMap.set(item._id, item);
      });
    }

    if (relatedMap.size < 3) {
      const keyword = (detail.tags && detail.tags[0]) || detail.subject || detail.category || '';
      if (keyword) {
        const result = await api.searchQuestions({ keyword, status: 'published', pageSize: 6 });
        (result.items || []).forEach((item) => {
          if (item._id !== detail._id && !relatedMap.has(item._id) && relatedMap.size < 3) {
            relatedMap.set(item._id, item);
          }
        });
      }
    }

    const related = Array.from(relatedMap.values()).slice(0, 3).map((item) => ({
      _id: item._id,
      title: item.title,
      subject: item.subject,
      answerSummary: item.answerSummary || item.answer || '暂无答案',
      difficultyText: this.formatDifficulty(item.difficulty)
    }));
    this.setData({ related });
  },
  toggleAnswer() {
    this.setData({ showFullAnswer: !this.data.showFullAnswer });
  },
  toggleAnalysis() {
    this.setData({ showFullAnalysis: !this.data.showFullAnalysis });
  },
  copyAnswer() {
    const { detail } = this.data;
    if (!detail || !detail.answer) return;
    wx.setClipboardData({ data: detail.answer });
  },
  searchByTag(e) {
    const { tag } = e.currentTarget.dataset;
    if (!tag) return;
    wx.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(tag)}` });
  },
  goRelated(e) {
    const { id } = e.currentTarget.dataset;
    wx.redirectTo({ url: `/pages/detail/index?id=${id}` });
  },
  goSearch() {
    const { detail } = this.data;
    const keyword = (detail && (detail.subject || (detail.tags && detail.tags[0]))) || '';
    const url = keyword ? `/pages/search/index?keyword=${encodeURIComponent(keyword)}` : '/pages/search/index';
    wx.navigateTo({ url });
  },
  goEdit() {
    const { detail } = this.data;
    if (!detail || !this.data.canEdit) return;
    wx.navigateTo({ url: `/pages/edit/index?id=${detail._id}` });
  },
  goTaskCenter() {
    wx.navigateTo({ url: '/pages/task-center/index' });
  },
  goImport() {
    const { importMeta } = this.data;
    const url = importMeta && importMeta.taskId
      ? `/pages/import/index?taskId=${encodeURIComponent(importMeta.taskId)}`
      : '/pages/import/index';
    wx.navigateTo({ url });
  },
  formatDifficulty(value) {
    return { easy: '简单', medium: '中等', hard: '困难' }[value] || '未设置';
  },
  formatStatus(value) {
    return { published: '已发布', draft: '草稿', review: '待审核', deleted: '已归档' }[value] || '未设置';
  },
  formatReview(value) {
    return { approved: '审核通过', pending: '待审核', rejected: '已驳回' }[value] || '未设置';
  },
  formatLifecycle(value) {
    return { published: '已上线', review: '审核中', draft: '草稿中', archived: '已归档', deleted: '已归档' }[value] || '未设置';
  },
  formatType(value) {
    return { single: '单选题', multiple: '多选题', qa: '问答题' }[value] || '未知题型';
  }
});
