const api = require('../../utils/question');
const { splitLines, splitCommaText, formatTime } = require('../../utils');
const { hasPermission, syncAdminContext } = require('../../utils/permissions');

const TYPE_OPTIONS = [
  { label: '单选题', value: 'single' },
  { label: '多选题', value: 'multiple' },
  { label: '问答题', value: 'qa' }
];
const DIFFICULTY_OPTIONS = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困难', value: 'hard' }
];
const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'review' },
  { label: '已发布', value: 'published' }
];
const REVIEW_OPTIONS = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' }
];

const emptyForm = {
  id: '',
  title: '',
  titleVariantsText: '',
  content: '',
  answer: '',
  answerSummary: '',
  analysis: '',
  tagsText: '',
  type: 'single',
  optionsText: '',
  subject: '',
  category: '',
  difficulty: 'medium',
  source: '',
  year: '',
  score: '2',
  status: 'draft',
  reviewStatus: 'pending',
  imageText: '',
  relatedIdsText: '',
  externalId: '',
  owner: '',
  ownerTeam: '',
  reviewer: '',
  reviewComment: '',
  sourceRef: '',
  changeReason: ''
};

function buildEditorInsights({ form = {}, importMeta = null } = {}) {
  const blockers = [];
  const cards = [];
  const acceptanceItems = [];

  const pushCard = (key, title, desc, selector, tone = 'neutral', cta = '去处理') => {
    cards.push({ key, title, desc, selector, tone, cta });
  };

  if (!form.title) {
    blockers.push('标题未填写');
    pushCard('title', '补标题', '题目标题为空，会直接影响搜索可读性与列表展示。', '#field-title', 'danger');
  }
  if (!form.content) {
    blockers.push('题干未填写');
    pushCard('content', '补题干', '题干为空时无法形成有效题目，也无法进入正式审核。', '#field-content', 'danger');
  }
  if (!form.answer) {
    blockers.push('答案未填写');
    pushCard('answer', '补答案', '标准答案为空，搜索和详情页都无法闭环。', '#field-answer', 'danger');
  }
  if (!form.answerSummary) {
    pushCard('answer-summary', '补答案摘要', '建议补一句适合列表 / 搜索结果展示的摘要。', '#field-answer-summary', 'warning');
  }
  if (!form.ownerTeam) {
    pushCard('owner-team', '补归属团队', '当前还没指定归属团队，治理链路会显得松散。', '#field-owner-team', 'warning');
  }
  if (!form.owner) {
    pushCard('owner', '补负责人', '建议明确负责人，方便导入和审核后的归口处理。', '#field-owner', 'neutral');
  }
  if ((form.reviewStatus === 'pending' || form.reviewStatus === 'approved' || form.reviewStatus === 'rejected') && !form.reviewer) {
    pushCard('reviewer', '补审核人', '当前审核态已进入流程，建议补全审核人字段。', '#field-reviewer', 'warning');
  }
  if (form.reviewStatus === 'rejected' && !form.reviewComment) {
    blockers.push('已驳回题目缺少审核备注');
    pushCard('review-comment', '补驳回原因', '已驳回题目应写明审核意见，方便后续修订。', '#field-review-comment', 'danger');
  }
  if (form.reviewStatus === 'approved' && !form.changeReason) {
    pushCard('change-reason', '补变更原因', '审核通过后建议记录变更原因，便于验收说明。', '#field-change-reason', 'warning');
  }
  if (importMeta && !form.sourceRef) {
    pushCard('source-ref', '补来源引用', '当前题目来自导入链路，建议补来源引用方便追溯。', '#field-source-ref', 'warning');
  }

  acceptanceItems.push(
    {
      key: 'base',
      title: '基础字段',
      passed: !!(form.title && form.content && form.answer),
      valueText: form.title && form.content && form.answer ? '完整' : '待补齐'
    },
    {
      key: 'search',
      title: '搜索呈现',
      passed: !!form.answerSummary,
      valueText: form.answerSummary ? '摘要就绪' : '缺摘要'
    },
    {
      key: 'governance',
      title: '治理归属',
      passed: !!(form.ownerTeam && form.owner),
      valueText: form.ownerTeam && form.owner ? '已指定' : '待补归属'
    },
    {
      key: 'review',
      title: '审核闭环',
      passed: form.reviewStatus !== 'rejected' || !!form.reviewComment,
      valueText: form.reviewStatus !== 'rejected' || form.reviewComment ? '可追溯' : '缺审核意见'
    }
  );

  const blockerCount = blockers.length;
  const warningCount = Math.max(cards.length - blockerCount, 0);
  const summaryText = blockerCount
    ? `当前有 ${blockerCount} 项关键阻塞，建议优先修掉再走审核 / 发布。`
    : warningCount
      ? `当前没有硬阻塞，仍有 ${warningCount} 项可优化内容，修完后更适合验收收口。`
      : '当前题目已满足主要编辑闭环条件，可继续审核、发布或做最终验收。';

  return {
    blockers,
    cards: cards.slice(0, 6),
    acceptanceItems,
    summaryText
  };
}

Page({
  data: {
    form: { ...emptyForm },
    loading: false,
    checking: true,
    isAdmin: false,
    admin: null,
    canEdit: false,
    canPublish: false,
    canApprove: false,
    canReject: false,
    isEdit: false,
    version: 1,
    lifecycleState: 'draft',
    typeOptions: TYPE_OPTIONS,
    difficultyOptions: DIFFICULTY_OPTIONS,
    statusOptions: STATUS_OPTIONS,
    reviewOptions: REVIEW_OPTIONS,
    typeIndex: 0,
    difficultyIndex: 1,
    statusIndex: 0,
    reviewIndex: 0,
    statusHistory: [],
    versionSnapshots: [],
    importMeta: null,
    editorSummaryText: '正在生成可修复项提示。',
    editorBlockers: [],
    editorQuickCards: [],
    acceptanceItems: []
  },
  async onLoad(options) {
    const id = options.id || '';
    this.setData({ 'form.id': id, isEdit: !!id });
    await this.bootstrap(id);
  },
  refreshEditorInsights() {
    const insights = buildEditorInsights({
      form: this.data.form,
      importMeta: this.data.importMeta
    });
    this.setData({
      editorSummaryText: insights.summaryText,
      editorBlockers: insights.blockers,
      editorQuickCards: insights.cards,
      acceptanceItems: insights.acceptanceItems
    });
  },
  async bootstrap(id = '') {
    this.setData({ checking: true });
    try {
      const info = await api.checkAdmin();
      syncAdminContext(info);
      const admin = info.admin || null;
      this.setData({
        isAdmin: !!info.isAdmin,
        admin,
        canEdit: hasPermission(admin, 'question.write'),
        canPublish: hasPermission(admin, 'question.publish'),
        canApprove: hasPermission(admin, 'review.approve'),
        canReject: hasPermission(admin, 'review.reject')
      });
      if (info.isAdmin && id) {
        await this.loadDetail(id);
      } else {
        this.refreshEditorInsights();
      }
    } catch (error) {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
  },
  async loadDetail(id) {
    try {
      const detail = await api.getQuestionDetail(id, { includeDeleted: true });
      if (!detail) return;
      const typeIndex = TYPE_OPTIONS.findIndex((item) => item.value === detail.type);
      const difficultyIndex = DIFFICULTY_OPTIONS.findIndex((item) => item.value === detail.difficulty);
      const statusIndex = STATUS_OPTIONS.findIndex((item) => item.value === (detail.status === 'deleted' ? 'draft' : detail.status));
      const reviewIndex = REVIEW_OPTIONS.findIndex((item) => item.value === (detail.reviewStatus || 'pending'));
      this.setData({
        form: {
          id: detail._id || id,
          title: detail.title || '',
          titleVariantsText: (detail.titleVariants || []).join(', '),
          content: detail.content || '',
          answer: detail.answer || '',
          answerSummary: detail.answerSummary || '',
          analysis: detail.analysis || '',
          tagsText: (detail.tags || []).join(', '),
          type: detail.type || 'single',
          optionsText: (detail.options || []).join('\n'),
          subject: detail.subject || '',
          category: detail.category || '',
          difficulty: detail.difficulty || 'medium',
          source: detail.source || '',
          year: detail.year ? String(detail.year) : '',
          score: detail.score ? String(detail.score) : '2',
          status: detail.status === 'deleted' ? 'draft' : (detail.status || 'draft'),
          reviewStatus: detail.reviewStatus || 'pending',
          imageText: detail.imageText || '',
          relatedIdsText: (detail.relatedIds || []).join(', '),
          externalId: detail.externalId || '',
          owner: detail.governance && detail.governance.owner ? detail.governance.owner : '',
          ownerTeam: detail.governance && detail.governance.ownerTeam ? detail.governance.ownerTeam : '',
          reviewer: detail.governance && detail.governance.reviewer ? detail.governance.reviewer : '',
          reviewComment: detail.governance && detail.governance.reviewComment ? detail.governance.reviewComment : '',
          sourceRef: detail.governance && detail.governance.sourceRef ? detail.governance.sourceRef : '',
          changeReason: ''
        },
        version: detail.version || 1,
        lifecycleState: detail.lifecycleState || 'draft',
        typeIndex: typeIndex >= 0 ? typeIndex : 0,
        difficultyIndex: difficultyIndex >= 0 ? difficultyIndex : 1,
        statusIndex: statusIndex >= 0 ? statusIndex : 0,
        reviewIndex: reviewIndex >= 0 ? reviewIndex : 0,
        statusHistory: (detail.statusHistory || []).slice(-6).reverse().map((item) => ({
          ...item,
          atText: formatTime(item.at)
        })),
        versionSnapshots: (detail.versionSnapshots || []).slice(-6).reverse().map((item) => ({
          ...item,
          atText: formatTime(item.at)
        })),
        importMeta: detail.importMeta || null
      }, () => this.refreshEditorInsights());
    } catch (error) {
      wx.showToast({ title: '详情加载失败', icon: 'none' });
    }
  },
  onFieldInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value }, () => this.refreshEditorInsights());
  },
  onTypeChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ typeIndex: index, 'form.type': TYPE_OPTIONS[index].value }, () => this.refreshEditorInsights());
  },
  onDifficultyChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ difficultyIndex: index, 'form.difficulty': DIFFICULTY_OPTIONS[index].value }, () => this.refreshEditorInsights());
  },
  onStatusChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ statusIndex: index, 'form.status': STATUS_OPTIONS[index].value }, () => this.refreshEditorInsights());
  },
  onReviewChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ reviewIndex: index, 'form.reviewStatus': REVIEW_OPTIONS[index].value }, () => this.refreshEditorInsights());
  },
  scrollToField(e) {
    const { selector } = e.currentTarget.dataset;
    if (!selector) return;
    wx.pageScrollTo({ selector, duration: 280 });
  },
  goTaskCenter() {
    wx.navigateTo({ url: '/pages/task-center/index' });
  },
  goImport() {
    const importMeta = this.data.importMeta || {};
    const url = importMeta.taskId ? `/pages/import/index?taskId=${encodeURIComponent(importMeta.taskId)}` : '/pages/import/index';
    wx.navigateTo({ url });
  },
  async handleSave() {
    const { form } = this.data;
    if (!this.data.canEdit) {
      wx.showToast({ title: '当前角色没有编辑权限', icon: 'none' });
      return;
    }
    if (!this.data.canPublish && form.status === 'published') {
      wx.showToast({ title: '当前角色没有发布权限', icon: 'none' });
      return;
    }
    if (!this.data.canApprove && form.reviewStatus === 'approved') {
      wx.showToast({ title: '当前角色没有审核通过权限', icon: 'none' });
      return;
    }
    if (!this.data.canReject && form.reviewStatus === 'rejected') {
      wx.showToast({ title: '当前角色没有驳回权限', icon: 'none' });
      return;
    }
    if (!form.title || !form.content || !form.answer) {
      wx.showToast({ title: '请填写标题、题干和答案', icon: 'none' });
      return;
    }
    const payload = {
      id: form.id,
      title: form.title,
      titleVariants: splitCommaText(form.titleVariantsText),
      content: form.content,
      answer: form.answer,
      answerSummary: form.answerSummary,
      analysis: form.analysis,
      tags: splitCommaText(form.tagsText),
      type: form.type,
      options: splitLines(form.optionsText),
      subject: form.subject,
      category: form.category,
      difficulty: form.difficulty,
      source: form.source,
      year: Number(form.year) || null,
      score: Number(form.score) || 0,
      status: form.status,
      reviewStatus: form.reviewStatus,
      imageText: form.imageText,
      relatedIds: splitCommaText(form.relatedIdsText),
      externalId: form.externalId,
      owner: form.owner,
      ownerTeam: form.ownerTeam,
      reviewer: form.reviewer,
      reviewComment: form.reviewComment,
      sourceRef: form.sourceRef,
      changeReason: form.changeReason
    };

    try {
      this.setData({ loading: true });
      const result = await api.saveQuestion(payload);
      this.setData({
        version: result && result.data ? result.data.version || this.data.version : this.data.version,
        lifecycleState: result && result.data ? result.data.lifecycleState || this.data.lifecycleState : this.data.lifecycleState
      });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      wx.showToast({ title: error && error.message ? error.message : '保存失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
