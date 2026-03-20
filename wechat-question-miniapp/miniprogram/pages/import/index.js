const api = require('../../utils/question');
const { safeJsonParse } = require('../../utils');

const TEMPLATE_PRESETS = {
  json: {
    label: '标准 JSON 数组',
    sourceType: 'json-array',
    templateType: 'standard-json',
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
    example: `{"questionTitle":"什么是 CDN？","description":"请解释 CDN 的作用。","result":"内容分发网络，用于就近分发与加速。","questionType":"qa","subject":"运维与架构","category":"网络加速","level":"medium"}
{"questionTitle":"React 中列表渲染为什么需要 key？","description":"请解释 key 的主要作用。","result":"帮助框架稳定识别节点，提高 diff 正确性。","questionType":"qa","subject":"前端开发","category":"React","level":"easy"}`
  },
  csv: {
    label: 'CSV / 表格粘贴',
    sourceType: 'csv-text',
    templateType: 'spreadsheet-csv',
    example: `题目,题干,答案,标签,题型,学科,分类,难度,状态,审核状态
HTTP 为什么无状态,解释 HTTP 为什么被称为无状态协议,协议本身不保存会话上下文,HTTP|协议,qa,Web 基础,协议,medium,published,approved
Redis 热点缓存原因,说明 Redis 为什么常用作缓存层,内存存储且访问快,Redis|缓存,qa,后端开发,缓存,medium,draft,pending`
  }
};

const DEDUPE_OPTIONS = [
  { label: '重复时跳过', value: 'skip' },
  { label: '重复时更新', value: 'update' }
];

const PRESET_KEYS = Object.keys(TEMPLATE_PRESETS);

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
  if (!raw) return [];
  const preset = TEMPLATE_PRESETS[presetKey] || TEMPLATE_PRESETS.json;

  if (presetKey === 'json' || presetKey === 'aliases') {
    const parsed = safeJsonParse(raw, null);
    return Array.isArray(parsed) ? parsed : [];
  }

  if (presetKey === 'jsonl') {
    return raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => safeJsonParse(line, null))
      .filter(Boolean);
  }

  if (presetKey === 'csv') {
    const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] !== undefined ? values[index] : '';
      });
      return row;
    });
  }

  return preset.sourceType === 'json-array' ? safeJsonParse(raw, []) : [];
}

Page({
  data: {
    presetOptions: PRESET_KEYS.map((key) => ({ key, label: TEMPLATE_PRESETS[key].label })),
    presetKey: 'aliases',
    presetIndex: PRESET_KEYS.indexOf('aliases'),
    text: TEMPLATE_PRESETS.aliases.example,
    loading: false,
    parseError: '',
    preview: null,
    importResult: null,
    dedupeOptions: DEDUPE_OPTIONS,
    dedupeIndex: 0,
    dedupeStrategy: 'skip',
    stagingItems: [],
    fieldMappingsText: '{\n  "title": ["题目", "questionTitle"],\n  "content": ["题干", "description"],\n  "answer": ["答案", "result"]\n}',
    importBatchId: 'demo-batch-20260320'
  },
  onLoad() {
    this.updatePreview(this.data.text, this.data.presetKey);
  },
  onPresetChange(e) {
    const index = Number(e.detail.value) || 0;
    const presetKey = PRESET_KEYS[index] || 'json';
    const preset = TEMPLATE_PRESETS[presetKey] || TEMPLATE_PRESETS.json;
    this.setData({
      presetIndex: index,
      presetKey,
      text: preset.example,
      importResult: null
    });
    this.updatePreview(preset.example, presetKey);
  },
  onInput(e) {
    const text = e.detail.value;
    this.setData({ text, importResult: null });
    this.updatePreview(text, this.data.presetKey);
  },
  onFieldMappingsInput(e) {
    this.setData({ fieldMappingsText: e.detail.value });
  },
  onBatchIdInput(e) {
    this.setData({ importBatchId: e.detail.value });
  },
  onDedupeChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({
      dedupeIndex: index,
      dedupeStrategy: DEDUPE_OPTIONS[index].value
    });
  },
  updatePreview(text, presetKey) {
    try {
      const items = parseRawText(text, presetKey);
      if (!Array.isArray(items) || !items.length) {
        this.setData({ preview: null, stagingItems: [], parseError: '当前内容无法解析为可导入记录，请检查格式或切换模板类型。' });
        return;
      }
      const preview = this.buildLocalPreview(items);
      this.setData({ preview, stagingItems: items, parseError: '' });
    } catch (error) {
      this.setData({ preview: null, stagingItems: [], parseError: '解析失败，请检查内容格式。' });
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
      total: items.length,
      columns,
      sample
    };
  },
  getFieldMappings() {
    const mappings = safeJsonParse(this.data.fieldMappingsText || '{}', {});
    return mappings && typeof mappings === 'object' ? mappings : {};
  },
  async previewOnCloud() {
    try {
      const items = this.data.stagingItems || [];
      if (!items.length) {
        wx.showToast({ title: '请先生成有效暂存数据', icon: 'none' });
        return;
      }
      this.setData({ loading: true });
      const preset = TEMPLATE_PRESETS[this.data.presetKey] || TEMPLATE_PRESETS.json;
      const result = await api.importQuestions(items, {
        previewOnly: true,
        dedupeStrategy: this.data.dedupeStrategy,
        sourceType: preset.sourceType,
        templateType: preset.templateType,
        importMode: 'staging',
        importBatchId: this.data.importBatchId,
        fieldMappings: this.getFieldMappings()
      });
      this.setData({ importResult: result });
      wx.showToast({ title: '预检完成', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '预检失败，请检查映射配置', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async handleImport() {
    try {
      const items = this.data.stagingItems || [];
      if (!items.length) {
        wx.showToast({ title: '请先生成有效暂存数据', icon: 'none' });
        return;
      }
      this.setData({ loading: true });
      const preset = TEMPLATE_PRESETS[this.data.presetKey] || TEMPLATE_PRESETS.json;
      const result = await api.importQuestions(items, {
        dedupeStrategy: this.data.dedupeStrategy,
        sourceType: preset.sourceType,
        templateType: preset.templateType,
        importMode: 'staging',
        importBatchId: this.data.importBatchId,
        fieldMappings: this.getFieldMappings()
      });
      this.setData({ importResult: result });
      wx.showToast({ title: '导入已完成', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '导入失败，请先修正预检错误', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
