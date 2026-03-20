const mock = require('../../utils/mock');
const { buildCollectionChecklistText, buildFirstRunChecklist, normalizeRuntime } = require('../../utils/bootstrap');

Page({
  data: {
    stats: {
      total: 0,
      published: 0,
      draft: 0,
      tags: 0
    },
    runtime: null,
    firstRunChecklist: [],
    hotTerms: ['HTTP', 'JavaScript', 'Redis', 'Vue'],
    featureList: [
      { title: '搜索体验更完整', desc: '热词、历史、排序、高亮结果都可直接演示' },
      { title: '题目结构更真实', desc: '题型、学科、难度、来源、分值、状态等字段已补齐' },
      { title: '后台流转更顺手', desc: '列表筛选、编辑录入、批量导入、软删除恢复一条线跑通' }
    ],
    demoJourney: [
      { step: '01', title: '首页进入搜索', desc: '用热词或 OCR 文本片段启动检索，快速展示用户侧入口。' },
      { step: '02', title: '搜索结果分组筛选', desc: '演示高亮摘要、分页、按学科/难度缩小范围与空结果建议。' },
      { step: '03', title: '详情页查看答案', desc: '展示答案摘要、完整解析、标签与相关题跳转。' },
      { step: '04', title: '后台治理流转', desc: '切到管理侧展示列表、编辑、导入和生命周期状态。' }
    ],
    repoHighlights: [
      { title: '可直接导入到微信开发者工具', desc: '项目结构清晰，mock 与云函数链路可切换。' },
      { title: 'README / docs 已按演示视角整理', desc: '方便别人打开仓库后快速理解功能、架构与落地方式。' }
    ]
  },
  onLoad() {
    const list = mock.sampleQuestions || [];
    const tags = new Set();
    list.forEach((item) => (item.tags || []).forEach((tag) => tags.add(tag)));
    const app = getApp();
    const runtime = normalizeRuntime((app && app.globalData && app.globalData.runtime) || {});
    this.setData({
      stats: {
        total: list.length,
        published: list.filter((item) => item.status === 'published').length,
        draft: list.filter((item) => item.status === 'draft').length,
        tags: tags.size
      },
      runtime,
      firstRunChecklist: buildFirstRunChecklist(runtime)
    });
  },
  goSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' });
  },
  goImport() {
    wx.navigateTo({ url: '/pages/import/index' });
  },
  onTapHotTerm(e) {
    const term = e.currentTarget.dataset.term;
    wx.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(term)}` });
  },
  copyCollectionChecklist() {
    wx.setClipboardData({ data: buildCollectionChecklistText() });
  }
});
