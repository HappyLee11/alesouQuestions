const api = require('../../utils/question');
const { safeJsonParse, formatTime } = require('../../utils');
const { hasPermission, syncAdminContext } = require('../../utils/permissions');

const IMPORT_TASKS_KEY = 'question-import-task-receipts';

const TEMPLATE_PRESETS = {
  json: {
    label: '标准 JSON 数组',
    sourceType: 'json-array',
    templateType: 'standard-json',
    suggestedFileName: 'questions.json',
    suggestedFileType: 'application/json',
    example: `[
  {
    "title": "Node.js 事件循环中微任务会在什么时候执行？",
    "content": "请简述 Promise.then 等微任务在一次事件循环中的执行时机。",
    "answer": "在当前宏任务结束后、下一个宏任务开始前执行。",
    "analysis": "微任务队列会在当前调用栈清空后立即依次执行。",
    "tags": ["Node.js", "事件循环"],
    "type": "qa",
    "subject": "后端开发",
    "category": "Node.js",
    "difficulty": "medium",
    "status": "review",
    "reviewStatus": "pending"
  }
]`
  },
  aliases: {
    label: '异构字段 JSON',
    sourceType: 'json-array',
    templateType: 'legacy-json',
    suggestedFileName: 'legacy-question-export.json',
    suggestedFileType: 'application/json',
    example: `[
  {
    "题目": "HTTPS 为什么更安全？",
    "题干": "请说明 HTTPS 相比 HTTP 多了哪些安全能力。",
    "答案": "TLS/SSL 加密、身份校验、完整性保护。",
    "解析": "正式导入前建议做字段映射、预览和去重。",
    "标签": "HTTP|安全",
    "题型": "qa",
    "学科": "Web 基础",
    "分类": "安全",
    "难度": "medium",
    "状态": "published",
    "审核状态": "approved",
    "别名": "HTTPS 提升了什么|HTTPS 更安全的原因"
  }
]`
  },
  jsonl: {
    label: 'JSON Lines / 导出日志',
    sourceType: 'json-lines',
    templateType: 'jsonl',
    suggestedFileName: 'question-export.jsonl',
    suggestedFileType: 'application/x-ndjson',
    example: `{"questionTitle":"什么是 CDN？","description":"请解释 CDN 的作用。","result":"内容分发网络，用于就近分发与加速。","questionType":"qa","subject":"运维与架构","category":"网络加速","level":"medium"}
{"questionTitle":"React 中列表渲染为什么需要 key？","description":"请解释 key 的主要作用。","result":"帮助框架稳定识别节点，提高 diff 正确性。","questionType":"qa","subject":"前端开发","category":"React","level":"easy"}`
  },
  csv: {
    label: 'CSV / 表格粘贴',
    sourceType: 'csv-text',
    templateType: 'spreadsheet-csv',
    suggestedFileName: 'question-import.csv',
    suggestedFileType: 'text/csv',
    example: `题目,题干,答案,标签,题型,学科,分类,难度,状态,审核状态
HTTP 为什么无状态,解释 HTTP 为什么被称为无状态协议,协议本身不保存会话上下文,HTTP|协议,qa,Web 基础,协议,medium,published,approved
Redis 热点缓存原因,说明 Redis 为什么常用作缓存层,内存存储且访问快,Redis|缓存,qa,后端开发,缓存,medium,draft,pending`
  },
  workbook: {
    label: 'XLSX/CSV 导入任务 Manifest',
    sourceType: 'xlsx-manifest',
    templateType: 'spreadsheet-workbook',
    suggestedFileName: 'question-import-manifest.json',
    suggestedFileType: 'application/json',
    example: `{
  "sourceType": "xlsx-manifest",
  "templateType": "spreadsheet-workbook",
  "fieldMappings": {
    "title": ["题目", "questionTitle", "试题名称"],
    "content": ["题干", "description", "正文"],
    "answer": ["答案", "result", "参考答案"],
    "owner": ["负责人"],
    "ownerTeam": ["归属团队"]
  },
  "task": {
    "taskId": "import-task-20260320-001",
    "taskName": "华东校招题库 3 月增量",
    "taskStatus": "staged",
    "fileName": "school-east-march.xlsx",
    "fileType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "sourceRef": "cos://imports/school-east-march.xlsx",
    "approvalPolicy": "manual-review"
  },
  "defaults": {
    "status": "review",
    "reviewStatus": "pending",
    "ownerTeam": "内容运营"
  },
  "sheets": [
    {
      "sheetName": "单选题",
      "templateType": "worksheet-single-choice",
      "rows": [
        {
          "__rowNumber": 2,
          "题目": "HTTP 301 表示什么？",
          "题干": "请说明 301 状态码的语义。",
          "答案": "永久重定向",
          "标签": "HTTP|协议",
          "题型": "qa",
          "学科": "Web 基础",
          "分类": "协议",
          "难度": "easy",
          "负责人": "内容A"
        }
      ]
    },
    {
      "sheetName": "问答题",
      "templateType": "worksheet-qa",
      "rows": [
        {
          "__rowNumber": 2,
          "questionTitle": "为什么需要 CDN？",
          "description": "请解释 CDN 在题库、图片或静态资源场景中的价值。",
          "result": "内容分发网络可以就近分发资源、降低源站压力并提升访问速度。",
          "tagList": "CDN|网络加速",
          "questionType": "qa",
          "subject": "运维与架构",
          "category": "网络加速",
          "level": "medium",
          "归属团队": "教研组"
        }
      ]
    }
  ]
}`
  }
};

const DEDUPE_OPTIONS = [
  { label: '重复时跳过', value: 'skip' },
  { label: '重复时更新', value: 'update' }
];

const STATUS_OPTIONS = [
  { label: '待审核', value: 'review' },
  { label: '草稿', value: 'draft' },
  { label: '直接发布', value: 'published' }
];

const REVIEW_OPTIONS = [
  { label: '待审核', value: 'pending' },
  { label: '审核通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' }
];

const APPROVAL_OPTIONS = [
  { label: '人工审核', value: 'manual-review' },
  { label: '双人复核', value: 'two-step-review' },
  { label: '自动通过（演示）', value: 'auto-approve' }
];

const PRESET_KEYS = Object.keys(TEMPLATE_PRESETS);
const REQUIRED_FIELD_ALIASES = {
  title: ['title', '题目', 'questionTitle', 'name'],
  content: ['content', '题干', 'description', 'question', 'body'],
  answer: ['answer', '答案', 'result']
};

function splitCsvLine(line = '') {
  const result = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseRawText(text = '', presetKey = 'json') {
  const raw = String(text || '').trim();
  if (!raw) return null;

  if (presetKey === 'json' || presetKey === 'aliases') {
    const parsed = safeJsonParse(raw, null);
    return Array.isArray(parsed) ? { type: 'items', items: parsed } : null;
  }

  if (presetKey === 'jsonl') {
    return {
      type: 'items',
      items: raw
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => safeJsonParse(line, null))
        .filter(Boolean)
    };
  }

  if (presetKey === 'csv') {
    const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return null;
    const headers = splitCsvLine(lines[0]);
    return {
      type: 'items',
      items: lines.slice(1).map((line) => {
        const values = splitCsvLine(line);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] !== undefined ? values[index] : '';
        });
        return row;
      })
    };
  }

  if (presetKey === 'workbook') {
    const manifest = safeJsonParse(raw, null);
    return manifest && typeof manifest === 'object' ? { type: 'manifest', manifest } : null;
  }

  return null;
}

function flattenManifestRows(manifest = {}) {
  const sheets = Array.isArray(manifest.sheets) ? manifest.sheets : [];
  const rows = [];
  sheets.forEach((sheet) => {
    (Array.isArray(sheet.rows) ? sheet.rows : []).forEach((row, index) => {
      rows.push({
        sheetName: sheet.sheetName || sheet.name || 'Sheet',
        rowNumber: Number(row.__rowNumber || row.rowNumber) || index + 2,
        row
      });
    });
  });
  return rows;
}

function summarizeResult(result = {}) {
  const data = result.data || {};
  return {
    total: data.total || 0,
    valid: data.valid !== undefined ? data.valid : Math.max((data.inserted || 0) + (data.updated || 0), 0),
    invalid: data.invalid !== undefined ? data.invalid : (data.failed || 0),
    warnings: Array.isArray(data.warnings) ? data.warnings.length : 0,
    deduplicated: data.deduplicated || 0
  };
}

function simpleHash(text = '') {
  let hash = 0;
  const input = String(text || '');
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return `stg-${Math.abs(hash).toString(16)}`;
}

function pickValue(row = {}, aliases = []) {
  for (let i = 0; i < aliases.length; i += 1) {
    const key = aliases[i];
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

function countFilled(items = [], aliases = []) {
  return items.filter((row) => !!pickValue(row, aliases)).length;
}

function buildStageReadiness(items = [], preview = null) {
  const total = items.length;
  const duplicateTitleCount = (() => {
    const seen = new Set();
    let duplicates = 0;
    items.forEach((row) => {
      const title = pickValue(row, REQUIRED_FIELD_ALIASES.title).replace(/[\s\-—_【】\[\]()（）]/g, '').toLowerCase();
      if (!title) return;
      if (seen.has(title)) duplicates += 1;
      seen.add(title);
    });
    return duplicates;
  })();
  const titleCount = countFilled(items, REQUIRED_FIELD_ALIASES.title);
  const contentCount = countFilled(items, REQUIRED_FIELD_ALIASES.content);
  const answerCount = countFilled(items, REQUIRED_FIELD_ALIASES.answer);
  const ownerTeamCount = countFilled(items, ['ownerTeam', '归属团队']);
  const ownerCount = countFilled(items, ['owner', '负责人']);
  const invalidCount = preview && preview.resultSummary ? preview.resultSummary.invalid : 0;
  const warningCount = preview && preview.resultSummary ? preview.resultSummary.warnings : 0;
  const previewPassed = !!(preview && preview.success && preview.batchMatched && invalidCount === 0);
  return {
    total,
    titleCount,
    contentCount,
    answerCount,
    ownerTeamCount,
    ownerCount,
    duplicateTitleCount,
    invalidCount,
    warningCount,
    previewPassed,
    blockers: [
      !total ? '暂存区没有可导入记录' : '',
      total && titleCount < total ? '存在缺少标题的记录' : '',
      total && contentCount < total ? '存在缺少题干的记录' : '',
      total && answerCount < total ? '存在缺少答案的记录' : '',
      duplicateTitleCount ? '同一批次内存在重复标题' : '',
      invalidCount ? '云端预检仍有错误记录' : ''
    ].filter(Boolean)
  };
}

Page({
  data: {
    checking: true,
    isAdmin: false,
    admin: null,
    canImport: false,
    presetOptions: PRESET_KEYS.map((key) => ({ key, label: TEMPLATE_PRESETS[key].label })),
    presetKey: 'workbook',
    presetIndex: PRESET_KEYS.indexOf('workbook'),
    text: TEMPLATE_PRESETS.workbook.example,
    taskName: '华东校招题库 3 月增量',
    fileName: TEMPLATE_PRESETS.workbook.suggestedFileName,
    fileType: TEMPLATE_PRESETS.workbook.suggestedFileType,
    sourceRef: 'local://staging/question-import-manifest.json',
    loading: false,
    parseError: '',
    preview: null,
    importResult: null,
    dedupeOptions: DEDUPE_OPTIONS,
    dedupeIndex: 0,
    dedupeStrategy: 'skip',
    stagingItems: [],
    importManifest: null,
    fieldMappingsText: '{\n  "title": ["题目", "questionTitle"],\n  "content": ["题干", "description"],\n  "answer": ["答案", "result"],\n  "owner": ["负责人"],\n  "ownerTeam": ["归属团队"]\n}',
    importBatchId: 'demo-batch-20260320',
    statusOptions: STATUS_OPTIONS,
    statusIndex: 0,
    reviewOptions: REVIEW_OPTIONS,
    reviewIndex: 0,
    approvalOptions: APPROVAL_OPTIONS,
    approvalIndex: 0,
    defaultOwnerTeam: '内容运营',
    defaultOwner: '',
    defaultReviewer: '',
    importReason: '批量导入新题',
    recentTasks: [],
    resultSummary: null,
    stageMeta: null,
    readiness: null,
    previewState: {
      statusText: '尚未预检',
      batchMatched: false,
      stageSignature: '',
      success: false,
      resultSummary: null,
      updatedAtText: '--'
    }
  },
  onLoad() {
    this.loadRecentTasks();
    this.applyPresetDefaults(this.data.presetKey, false);
    this.updatePreview(this.data.text, this.data.presetKey);
    this.bootstrapAccess();
  },
  async bootstrapAccess() {
    this.setData({ checking: true });
    try {
      const info = await api.checkAdmin();
      syncAdminContext(info);
      this.setData({
        isAdmin: !!info.isAdmin,
        admin: info.admin || null,
        canImport: hasPermission(info.admin, 'question.import')
      });
    } catch (error) {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
  },
  applyPresetDefaults(presetKey = 'json', replaceText = true) {
    const preset = TEMPLATE_PRESETS[presetKey] || TEMPLATE_PRESETS.json;
    this.setData({
      fileName: preset.suggestedFileName,
      fileType: preset.suggestedFileType,
      sourceRef: `local://staging/${preset.suggestedFileName}`,
      taskName: presetKey === 'workbook' ? '华东校招题库 3 月增量' : `题库导入-${preset.label}`,
      ...(replaceText ? { text: preset.example } : {})
    });
  },
  onPresetChange(e) {
    const index = Number(e.detail.value) || 0;
    const presetKey = PRESET_KEYS[index] || 'json';
    const preset = TEMPLATE_PRESETS[presetKey] || TEMPLATE_PRESETS.json;
    this.setData({
      presetIndex: index,
      presetKey,
      text: preset.example,
      importResult: null,
      resultSummary: null,
      previewState: {
        statusText: '尚未预检',
        batchMatched: false,
        stageSignature: '',
        success: false,
        resultSummary: null,
        updatedAtText: '--'
      }
    });
    this.applyPresetDefaults(presetKey);
    this.updatePreview(preset.example, presetKey);
  },
  onInput(e) {
    const text = e.detail.value;
    this.setData({ text, importResult: null, resultSummary: null });
    this.resetPreviewState();
    this.updatePreview(text, this.data.presetKey);
  },
  onFieldMappingsInput(e) {
    this.setData({ fieldMappingsText: e.detail.value });
    this.resetPreviewState();
  },
  onBatchIdInput(e) {
    this.setData({ importBatchId: e.detail.value });
    this.resetPreviewState();
    this.refreshStageMeta();
  },
  onTaskNameInput(e) {
    this.setData({ taskName: e.detail.value });
    this.resetPreviewState();
    this.refreshStageMeta();
  },
  onFileNameInput(e) {
    this.setData({ fileName: e.detail.value });
    this.resetPreviewState();
    this.refreshStageMeta();
  },
  onFileTypeInput(e) {
    this.setData({ fileType: e.detail.value });
    this.resetPreviewState();
    this.refreshStageMeta();
  },
  onSourceRefInput(e) {
    this.setData({ sourceRef: e.detail.value });
    this.resetPreviewState();
    this.refreshStageMeta();
  },
  onDedupeChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({
      dedupeIndex: index,
      dedupeStrategy: DEDUPE_OPTIONS[index].value
    });
    this.resetPreviewState();
  },
  onStatusChange(e) {
    this.setData({ statusIndex: Number(e.detail.value) || 0 });
    this.resetPreviewState();
  },
  onReviewChange(e) {
    this.setData({ reviewIndex: Number(e.detail.value) || 0 });
    this.resetPreviewState();
  },
  onApprovalChange(e) {
    this.setData({ approvalIndex: Number(e.detail.value) || 0 });
    this.resetPreviewState();
  },
  onDefaultOwnerInput(e) {
    this.setData({ defaultOwner: e.detail.value });
    this.resetPreviewState();
  },
  onDefaultOwnerTeamInput(e) {
    this.setData({ defaultOwnerTeam: e.detail.value });
    this.resetPreviewState();
  },
  onDefaultReviewerInput(e) {
    this.setData({ defaultReviewer: e.detail.value });
    this.resetPreviewState();
  },
  onImportReasonInput(e) {
    this.setData({ importReason: e.detail.value });
    this.resetPreviewState();
  },
  resetPreviewState() {
    this.setData({
      previewState: {
        statusText: '暂存内容已变化，需重新预检',
        batchMatched: false,
        stageSignature: '',
        success: false,
        resultSummary: null,
        updatedAtText: '--'
      }
    });
    this.refreshReadiness();
  },
  loadRecentTasks() {
    const recentTasks = (wx.getStorageSync(IMPORT_TASKS_KEY) || []).map((item) => ({
      ...item,
      timeText: item.createdAt ? formatTime(item.createdAt) : '--'
    }));
    this.setData({ recentTasks });
  },
  saveRecentTask(payload = {}) {
    const current = wx.getStorageSync(IMPORT_TASKS_KEY) || [];
    const next = [payload].concat(current).slice(0, 8);
    wx.setStorageSync(IMPORT_TASKS_KEY, next);
    this.loadRecentTasks();
  },
  refreshStageMeta(items = this.data.stagingItems, preview = this.data.preview) {
    const preset = TEMPLATE_PRESETS[this.data.presetKey] || TEMPLATE_PRESETS.json;
    const rawText = this.data.text || '';
    const stageMeta = {
      sourceType: preset.sourceType,
      templateType: preset.templateType,
      charCount: rawText.length,
      rowCount: items.length,
      sheetCount: preview && preview.sheetSummary ? preview.sheetSummary.length : 0,
      stageChecksum: simpleHash(rawText),
      fileName: this.data.fileName || preset.suggestedFileName,
      fileType: this.data.fileType || preset.suggestedFileType,
      sourceRef: this.data.sourceRef || `local://staging/${preset.suggestedFileName}`,
      taskName: this.data.taskName || `题库导入-${preset.label}`,
      batchId: this.data.importBatchId || 'demo-batch',
      stageSignature: ''
    };
    stageMeta.stageSignature = this.buildStageSignature(stageMeta);
    this.setData({ stageMeta });
    this.refreshReadiness(items, null, stageMeta);
    return stageMeta;
  },
  buildStageSignature(stageMeta = this.data.stageMeta || {}) {
    return [
      stageMeta.stageChecksum || '',
      this.data.importBatchId || '',
      this.data.dedupeStrategy || '',
      this.data.statusOptions[this.data.statusIndex].value,
      this.data.reviewOptions[this.data.reviewIndex].value,
      this.data.approvalOptions[this.data.approvalIndex].value,
      this.data.defaultOwner || '',
      this.data.defaultOwnerTeam || '',
      this.data.defaultReviewer || '',
      this.data.importReason || '',
      this.data.fieldMappingsText || ''
    ].join('::');
  },
  refreshReadiness(items = this.data.stagingItems, previewState = this.data.previewState, stageMeta = this.data.stageMeta) {
    const batchMatched = previewState && previewState.stageSignature && stageMeta
      ? previewState.stageSignature === this.buildStageSignature(stageMeta)
      : false;
    const readiness = buildStageReadiness(items, {
      success: previewState && previewState.success,
      batchMatched,
      resultSummary: previewState && previewState.resultSummary
    });
    this.setData({ readiness });
  },
  updatePreview(text, presetKey) {
    try {
      const parsed = parseRawText(text, presetKey);
      if (!parsed) {
        this.setData({ preview: null, stagingItems: [], importManifest: null, parseError: '当前内容无法解析为可导入记录，请检查格式或切换模板类型。' });
        this.refreshStageMeta([], null);
        return;
      }
      if (parsed.type === 'manifest') {
        const rows = flattenManifestRows(parsed.manifest);
        if (!rows.length) {
          this.setData({ preview: null, stagingItems: [], importManifest: null, parseError: 'Manifest 中没有可导入 rows。' });
          this.refreshStageMeta([], null);
          return;
        }
        const preview = this.buildManifestPreview(parsed.manifest, rows);
        this.setData({ preview, importManifest: parsed.manifest, stagingItems: rows.map((item) => item.row), parseError: '' });
        this.refreshStageMeta(rows.map((item) => item.row), preview);
        return;
      }
      const items = parsed.items || [];
      if (!Array.isArray(items) || !items.length) {
        this.setData({ preview: null, stagingItems: [], importManifest: null, parseError: '当前内容无法解析为可导入记录，请检查格式或切换模板类型。' });
        this.refreshStageMeta([], null);
        return;
      }
      const preview = this.buildLocalPreview(items);
      this.setData({ preview, stagingItems: items, importManifest: null, parseError: '' });
      this.refreshStageMeta(items, preview);
    } catch (error) {
      this.setData({ preview: null, stagingItems: [], importManifest: null, parseError: '解析失败，请检查内容格式。' });
      this.refreshStageMeta([], null);
    }
  },
  buildLocalPreview(items = []) {
    const fieldSets = items.map((item) => Object.keys(item || {}));
    const columns = Array.from(new Set([].concat(...fieldSets))).slice(0, 30);
    const sample = items.slice(0, 5).map((item, index) => ({
      index,
      title: item.title || item.题目 || item.questionTitle || '--',
      keys: Object.keys(item || {}).join(' / ')
    }));
    return {
      mode: 'items',
      total: items.length,
      columns,
      sample,
      sheetSummary: []
    };
  },
  buildManifestPreview(manifest = {}, rows = []) {
    const sample = rows.slice(0, 5).map((item, index) => ({
      index,
      title: item.row.title || item.row.题目 || item.row.questionTitle || '--',
      keys: `${item.sheetName} / row ${item.rowNumber} / ${Object.keys(item.row || {}).join(' / ')}`
    }));
    const columns = Array.from(new Set(rows.reduce((acc, item) => acc.concat(Object.keys(item.row || {})), []))).slice(0, 30);
    const sheetSummary = [];
    const map = {};
    rows.forEach((item) => {
      map[item.sheetName] = (map[item.sheetName] || 0) + 1;
    });
    Object.keys(map).forEach((key) => sheetSummary.push({ sheetName: key, total: map[key] }));
    return {
      mode: 'manifest',
      total: rows.length,
      columns,
      sample,
      taskName: manifest.task && (manifest.task.taskName || manifest.task.fileName) ? (manifest.task.taskName || manifest.task.fileName) : '--',
      fileName: manifest.task && manifest.task.fileName ? manifest.task.fileName : '--',
      sheetSummary
    };
  },
  getFieldMappings() {
    const mappings = safeJsonParse(this.data.fieldMappingsText || '{}', {});
    return mappings && typeof mappings === 'object' ? mappings : {};
  },
  buildTaskPayload() {
    const stageMeta = this.data.stageMeta || this.refreshStageMeta();
    return {
      taskId: `${this.data.importBatchId || 'demo-batch'}-${stageMeta.stageChecksum}`,
      taskName: this.data.taskName || stageMeta.taskName,
      taskStatus: 'staged',
      fileName: this.data.fileName || stageMeta.fileName,
      fileType: this.data.fileType || stageMeta.fileType,
      sourceRef: this.data.sourceRef || stageMeta.sourceRef,
      approvalPolicy: this.data.approvalOptions[this.data.approvalIndex].value,
      stagedAt: Date.now(),
      stagingChecksum: stageMeta.stageChecksum
    };
  },
  buildImportPayload() {
    const preset = TEMPLATE_PRESETS[this.data.presetKey] || TEMPLATE_PRESETS.json;
    const task = this.buildTaskPayload();
    const base = {
      dedupeStrategy: this.data.dedupeStrategy,
      sourceType: preset.sourceType,
      templateType: preset.templateType,
      importMode: 'staging',
      importBatchId: this.data.importBatchId,
      fieldMappings: this.getFieldMappings(),
      defaultStatus: this.data.statusOptions[this.data.statusIndex].value,
      defaultReviewStatus: this.data.reviewOptions[this.data.reviewIndex].value,
      defaultOwnerTeam: this.data.defaultOwnerTeam.trim(),
      defaultOwner: this.data.defaultOwner.trim(),
      defaultReviewer: this.data.defaultReviewer.trim(),
      approvalPolicy: this.data.approvalOptions[this.data.approvalIndex].value,
      importReason: this.data.importReason.trim(),
      task,
      taskId: task.taskId,
      taskName: task.taskName,
      fileName: task.fileName,
      fileType: task.fileType,
      sourceRef: task.sourceRef,
      stagingChecksum: task.stagingChecksum
    };
    if (this.data.importManifest) {
      return {
        ...base,
        importManifest: {
          ...this.data.importManifest,
          importBatchId: this.data.importBatchId,
          fieldMappings: {
            ...((this.data.importManifest && this.data.importManifest.fieldMappings) || {}),
            ...this.getFieldMappings()
          },
          defaults: {
            ...((this.data.importManifest && this.data.importManifest.defaults) || {}),
            status: base.defaultStatus,
            reviewStatus: base.defaultReviewStatus,
            owner: base.defaultOwner,
            ownerTeam: base.defaultOwnerTeam,
            reviewer: base.defaultReviewer,
            approvalPolicy: base.approvalPolicy
          },
          task: {
            ...((this.data.importManifest && this.data.importManifest.task) || {}),
            ...task,
            approvalPolicy: base.approvalPolicy,
            reason: base.importReason
          }
        }
      };
    }
    return {
      ...base,
      items: this.data.stagingItems || []
    };
  },
  buildReceipt(mode = 'preview', result = {}) {
    const data = result.data || {};
    const task = data.task || this.buildTaskPayload();
    const preset = TEMPLATE_PRESETS[this.data.presetKey] || TEMPLATE_PRESETS.json;
    return {
      mode,
      createdAt: Date.now(),
      batchId: this.data.importBatchId,
      taskId: task.taskId || '',
      taskName: task.taskName || task.fileName || `${this.data.importBatchId}-${mode}`,
      fileName: task.fileName || (this.data.preview && this.data.preview.fileName) || '--',
      fileType: task.fileType || this.data.fileType,
      sourceRef: task.sourceRef || this.data.sourceRef,
      stagingChecksum: (this.data.stageMeta && this.data.stageMeta.stageChecksum) || '',
      sourceType: data.sourceType || preset.sourceType,
      templateType: data.templateType || preset.templateType,
      dedupeStrategy: data.dedupeStrategy || this.data.dedupeStrategy,
      approvalPolicy: this.data.approvalOptions[this.data.approvalIndex].value,
      total: data.total || this.data.preview && this.data.preview.total || 0,
      valid: data.valid !== undefined ? data.valid : ((data.inserted || 0) + (data.updated || 0)),
      invalid: data.invalid !== undefined ? data.invalid : (data.failed || 0),
      warnings: Array.isArray(data.warnings) ? data.warnings.length : 0,
      inserted: data.inserted || 0,
      updated: data.updated || 0,
      deduplicated: data.deduplicated || 0,
      ownerTeam: this.data.defaultOwnerTeam || '--',
      statusLabel: mode === 'preview' ? '已预检' : '已导入'
    };
  },
  async previewOnCloud() {
    try {
      if (!this.data.canImport) {
        wx.showToast({ title: '当前角色没有导入权限', icon: 'none' });
        return;
      }
      if (!this.data.stagingItems.length && !this.data.importManifest) {
        wx.showToast({ title: '请先生成有效暂存数据', icon: 'none' });
        return;
      }
      this.setData({ loading: true });
      const result = await api.importQuestions(undefined, {
        ...this.buildImportPayload(),
        previewOnly: true
      });
      const resultSummary = summarizeResult(result);
      const stageSignature = this.buildStageSignature();
      const success = !!(result && result.success);
      this.setData({
        importResult: result,
        resultSummary,
        previewState: {
          statusText: success ? (resultSummary.invalid ? '预检未通过' : '预检通过，可执行导入') : '预检失败',
          batchMatched: true,
          stageSignature,
          success,
          resultSummary,
          updatedAtText: formatTime(Date.now())
        }
      });
      this.refreshReadiness();
      this.saveRecentTask(this.buildReceipt('preview', result));
      wx.showToast({ title: success ? '预检完成' : '预检失败', icon: success ? 'success' : 'none' });
    } catch (error) {
      wx.showToast({ title: '预检失败，请检查映射配置', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async handleImport() {
    try {
      if (!this.data.canImport) {
        wx.showToast({ title: '当前角色没有导入权限', icon: 'none' });
        return;
      }
      if (!this.data.stagingItems.length && !this.data.importManifest) {
        wx.showToast({ title: '请先生成有效暂存数据', icon: 'none' });
        return;
      }
      if (!this.data.readiness || this.data.readiness.blockers.length) {
        wx.showToast({ title: '请先修正暂存问题并完成预检', icon: 'none' });
        return;
      }
      this.setData({ loading: true });
      const result = await api.importQuestions(undefined, this.buildImportPayload());
      this.setData({ importResult: result, resultSummary: summarizeResult(result) });
      this.saveRecentTask(this.buildReceipt('import', result));
      wx.showToast({ title: '导入已完成', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '导入失败，请先修正预检错误', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
