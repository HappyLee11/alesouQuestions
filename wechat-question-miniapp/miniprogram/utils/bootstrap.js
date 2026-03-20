const mock = require('./mock');

const DEFAULT_COLLECTIONS = ['questions', 'admins', 'import_tasks', 'audit_logs'];

function normalizeRuntime(runtime = {}) {
  const envId = String(runtime.envId || '').trim();
  const cloudConfigured = !!envId && !/your-cloud-env-id/i.test(envId);
  return {
    envId,
    cloudAvailable: runtime.cloudAvailable !== false,
    cloudConfigured,
    initError: runtime.initError || '',
    useMockOnFail: runtime.useMockOnFail !== false
  };
}

function buildAdminSeed(openid = '') {
  return {
    openid: String(openid || 'your-openid').trim() || 'your-openid',
    name: 'Primary Admin',
    enabled: true,
    role: 'super_admin',
    ownerTeam: '内容运营'
  };
}

function buildAdminSeedText(openid = '') {
  return JSON.stringify(buildAdminSeed(openid), null, 2);
}

function buildCollectionChecklistText() {
  return DEFAULT_COLLECTIONS.map((name, index) => `${index + 1}. ${name}`).join('\n');
}

function buildFieldMappingsText() {
  return JSON.stringify({
    title: ['题目', 'questionTitle'],
    content: ['题干', 'description'],
    answer: ['答案', 'result'],
    owner: ['负责人', 'owner'],
    ownerTeam: ['归属团队', 'ownerTeam'],
    reviewer: ['审核人', 'reviewer'],
    reviewComment: ['审核备注', 'reviewComment']
  }, null, 2);
}

function buildDemoImportItems() {
  return (mock.sampleQuestions || []).map((item, index) => ({
    title: item.title,
    content: item.content,
    answer: item.answer,
    analysis: item.analysis,
    answerSummary: item.answerSummary,
    tags: item.tags || [],
    type: item.type || 'qa',
    options: item.options || [],
    subject: item.subject || '',
    category: item.category || '',
    difficulty: item.difficulty || 'medium',
    source: item.source || '演示题库',
    year: item.year || 2025,
    score: item.score || 0,
    status: item.status === 'deleted' ? 'review' : (item.status || 'review'),
    reviewStatus: item.reviewStatus === 'rejected' ? 'pending' : (item.reviewStatus || 'pending'),
    titleVariants: item.titleVariants || [],
    imageText: item.imageText || '',
    relatedIds: item.relatedIds || [],
    externalId: item._id || `demo-${index + 1}`,
    owner: index % 2 === 0 ? '内容A' : '内容B',
    ownerTeam: item.subject || '内容运营',
    reviewer: '审核员A',
    reviewComment: '用于上传后首日演示初始化'
  }));
}

function buildDemoJsonText() {
  return JSON.stringify(buildDemoImportItems(), null, 2);
}

function buildDemoWorkbookManifest() {
  const items = buildDemoImportItems();
  const midpoint = Math.ceil(items.length / 2);
  const sheets = [
    {
      sheetName: '精选单题',
      templateType: 'worksheet-mixed-demo',
      rows: items.slice(0, midpoint).map((item, index) => ({
        __rowNumber: index + 2,
        题目: item.title,
        题干: item.content,
        答案: item.answer,
        解析: item.analysis,
        标签: (item.tags || []).join('|'),
        题型: item.type,
        学科: item.subject,
        分类: item.category,
        难度: item.difficulty,
        负责人: item.owner,
        归属团队: item.ownerTeam,
        审核人: item.reviewer,
        审核备注: item.reviewComment,
        来源: item.source,
        外部ID: item.externalId
      }))
    },
    {
      sheetName: '问答专题',
      templateType: 'worksheet-mixed-demo',
      rows: items.slice(midpoint).map((item, index) => ({
        __rowNumber: index + 2,
        questionTitle: item.title,
        description: item.content,
        result: item.answer,
        analysis: item.analysis,
        tagList: (item.tags || []).join('|'),
        questionType: item.type,
        subject: item.subject,
        category: item.category,
        level: item.difficulty,
        owner: item.owner,
        ownerTeam: item.ownerTeam,
        reviewer: item.reviewer,
        reviewComment: item.reviewComment,
        source: item.source,
        externalId: item.externalId
      }))
    }
  ];

  return JSON.stringify({
    sourceType: 'xlsx-manifest',
    templateType: 'spreadsheet-workbook',
    fieldMappings: {
      title: ['题目', 'questionTitle'],
      content: ['题干', 'description'],
      answer: ['答案', 'result'],
      analysis: ['解析'],
      owner: ['负责人', 'owner'],
      ownerTeam: ['归属团队', 'ownerTeam'],
      reviewer: ['审核人', 'reviewer'],
      reviewComment: ['审核备注', 'reviewComment']
    },
    task: {
      taskId: 'demo-first-run-seed',
      taskName: '上传后首日演示题库初始化',
      taskStatus: 'staged',
      fileName: 'demo-first-run-seed.xlsx',
      fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sourceRef: 'local://staging/demo-first-run-seed.xlsx',
      approvalPolicy: 'manual-review'
    },
    defaults: {
      status: 'review',
      reviewStatus: 'pending',
      ownerTeam: '内容运营'
    },
    sheets
  }, null, 2);
}

function buildFirstRunChecklist(runtime = {}) {
  const status = normalizeRuntime(runtime);
  return [
    {
      title: status.cloudConfigured ? '云环境已写入项目配置' : '先补云环境 ID',
      desc: status.cloudConfigured ? `当前 env：${status.envId}` : '请先在 miniprogram/app.js 和 project.config.json 中填写真实云环境。'
    },
    {
      title: '创建数据库集合',
      desc: `至少创建：${DEFAULT_COLLECTIONS.join(' / ')}`
    },
    {
      title: '第一次打开后台时复制 OPENID',
      desc: '把当前账号加入 admins 集合，并将 enabled 设为 true。'
    },
    {
      title: '导入演示题库',
      desc: '导入页支持一键填入演示 JSON 或 workbook manifest，先预检再导入。'
    }
  ];
}

module.exports = {
  DEFAULT_COLLECTIONS,
  normalizeRuntime,
  buildAdminSeed,
  buildAdminSeedText,
  buildCollectionChecklistText,
  buildFieldMappingsText,
  buildDemoImportItems,
  buildDemoJsonText,
  buildDemoWorkbookManifest,
  buildFirstRunChecklist
};
