const api = require('../../utils/question');
const { formatTime } = require('../../utils');

Page({
  data: {
    id: '',
    detail: null,
    related: [],
    loading: true,
    showFullAnswer: false,
    showFullAnalysis: false
  },
  async onLoad(options) {
    const id = options.id || '';
    this.setData({ id });
    await this.loadDetail();
  },
  async loadDetail() {
    try {
      const detail = await api.getQuestionDetail(this.data.id);
      if (detail) {
        detail.updatedAtText = formatTime(detail.updatedAt);
        detail.createdAtText = formatTime(detail.createdAt);
        detail.difficultyText = this.formatDifficulty(detail.difficulty);
        detail.statusText = this.formatStatus(detail.status);
        detail.answerShort = detail.answerSummary || detail.answer || '暂无答案';
        detail.analysisShort = this.buildShortText(detail.analysis || '暂无解析', 66);
        detail.typeText = this.formatType(detail.type);
        detail.stats = [
          { label: '浏览', value: detail.viewCount || 0 },
          { label: '收藏', value: detail.favoriteCount || 0 },
          { label: '版本', value: detail.version || 1 },
          { label: '分值', value: detail.score || '--' }
        ];
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
  formatDifficulty(value) {
    return { easy: '简单', medium: '中等', hard: '困难' }[value] || '未设置';
  },
  formatStatus(value) {
    return { published: '已发布', draft: '草稿', review: '待审核', deleted: '已归档' }[value] || '未设置';
  },
  formatType(value) {
    return { single: '单选题', multiple: '多选题', qa: '问答题' }[value] || '未知题型';
  }
});
