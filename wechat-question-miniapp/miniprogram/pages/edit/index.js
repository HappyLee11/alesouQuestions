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
    importMeta: null
  },
  async onLoad(options) {
    const id = options.id || '';
    this.setData({ 'form.id': id, isEdit: !!id });
    await this.bootstrap(id);
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
      });
    } catch (error) {
      wx.showToast({ title: '详情加载失败', icon: 'none' });
    }
  },
  onFieldInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },
  onTypeChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ typeIndex: index, 'form.type': TYPE_OPTIONS[index].value });
  },
  onDifficultyChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ difficultyIndex: index, 'form.difficulty': DIFFICULTY_OPTIONS[index].value });
  },
  onStatusChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ statusIndex: index, 'form.status': STATUS_OPTIONS[index].value });
  },
  onReviewChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ reviewIndex: index, 'form.reviewStatus': REVIEW_OPTIONS[index].value });
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
