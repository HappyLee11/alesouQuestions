const mock = require('../../utils/mock');

Page({
  data: {
    stats: {
      total: 0,
      published: 0,
      draft: 0,
      tags: 0
    },
    hotTerms: ['HTTP', 'JavaScript', 'Redis', 'Vue'],
    featureList: [
      { title: '搜索体验更完整', desc: '热词、历史、排序、高亮结果都可直接演示' },
      { title: '题目结构更真实', desc: '题型、学科、难度、来源、分值、状态等字段已补齐' },
      { title: '后台流转更顺手', desc: '列表筛选、编辑录入、批量导入、软删除恢复一条线跑通' }
    ]
  },
  onLoad() {
    const list = mock.sampleQuestions || [];
    const tags = new Set();
    list.forEach((item) => (item.tags || []).forEach((tag) => tags.add(tag)));
    this.setData({
      stats: {
        total: list.length,
        published: list.filter((item) => item.status === 'published').length,
        draft: list.filter((item) => item.status === 'draft').length,
        tags: tags.size
      }
    });
  },
  goSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' });
  },
  onTapHotTerm(e) {
    const term = e.currentTarget.dataset.term;
    wx.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(term)}` });
  }
});
