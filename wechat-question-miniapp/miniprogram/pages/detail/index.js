const api = require('../../utils/question');
const { formatTime } = require('../../utils');

Page({
  data: {
    id: '',
    detail: null,
    related: [],
    loading: true,
    showFullAnswer: false
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
      }
      this.setData({ detail });
      await this.loadRelated(detail);
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async loadRelated(detail) {
    if (!detail) return;
    const keyword = (detail.tags && detail.tags[0]) || detail.subject || detail.category || '';
    if (!keyword) return;
    const result = await api.searchQuestions({ keyword, status: 'published', pageSize: 6 });
    const related = (result.items || []).filter((item) => item._id !== detail._id).slice(0, 3).map((item) => ({
      _id: item._id,
      title: item.title,
      subject: item.subject,
      difficultyText: this.formatDifficulty(item.difficulty)
    }));
    this.setData({ related });
  },
  toggleAnswer() {
    this.setData({ showFullAnswer: !this.data.showFullAnswer });
  },
  goRelated(e) {
    const { id } = e.currentTarget.dataset;
    wx.redirectTo({ url: `/pages/detail/index?id=${id}` });
  },
  formatDifficulty(value) {
    return { easy: '简单', medium: '中等', hard: '困难' }[value] || '未设置';
  },
  formatStatus(value) {
    return { published: '已发布', draft: '草稿', deleted: '已归档' }[value] || '未设置';
  }
});
