const api = require('../../utils/question');
const { splitLines } = require('../../utils');

const emptyForm = {
  id: '',
  title: '',
  content: '',
  answer: '',
  analysis: '',
  tagsText: '',
  type: 'single',
  optionsText: ''
};

Page({
  data: {
    form: { ...emptyForm },
    loading: false,
    isEdit: false
  },
  async onLoad(options) {
    const id = options.id || '';
    if (!id) return;
    this.setData({ 'form.id': id, isEdit: true });
    await this.loadDetail(id);
  },
  async loadDetail(id) {
    try {
      const detail = await api.getQuestionDetail(id);
      if (!detail) return;
      this.setData({
        form: {
          id: detail._id || id,
          title: detail.title || '',
          content: detail.content || '',
          answer: detail.answer || '',
          analysis: detail.analysis || '',
          tagsText: (detail.tags || []).join(','),
          type: detail.type || 'single',
          optionsText: (detail.options || []).join('\n')
        }
      });
    } catch (error) {
      wx.showToast({ title: '详情加载失败', icon: 'none' });
    }
  },
  onFieldInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },
  async handleSave() {
    const { form } = this.data;
    if (!form.title || !form.content) {
      wx.showToast({ title: '请填写标题和题干', icon: 'none' });
      return;
    }
    const payload = {
      id: form.id,
      title: form.title,
      content: form.content,
      answer: form.answer,
      analysis: form.analysis,
      tags: form.tagsText.split(',').map((i) => i.trim()).filter(Boolean),
      type: form.type,
      options: splitLines(form.optionsText)
    };

    try {
      this.setData({ loading: true });
      await api.saveQuestion(payload);
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
