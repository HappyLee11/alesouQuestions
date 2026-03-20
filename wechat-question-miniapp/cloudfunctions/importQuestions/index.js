const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const BASE_FIELD_ALIASES = {
  title: ['title', '题目', '题干标题', 'questionTitle', 'name'],
  content: ['content', '题干', 'question', 'description', 'body'],
  answer: ['answer', '答案', 'result'],
  answerSummary: ['answerSummary', '答案摘要', 'summary'],
  analysis: ['analysis', '解析', 'explanation'],
  tags: ['tags', '标签', 'tagList'],
  type: ['type', '题型', 'questionType'],
  options: ['options', '选项', 'choices'],
  subject: ['subject', '学科', '科目'],
  category: ['category', '分类', '章节'],
  difficulty: ['difficulty', '难度', 'level'],
  source: ['source', '来源', '题库来源'],
  year: ['year', '年份'],
  score: ['score', '分值', 'points'],
  status: ['status', '状态'],
  reviewStatus: ['reviewStatus', '审核状态'],
  titleVariants: ['titleVariants', '标题变体', '别名', 'aliases'],
  imageText: ['imageText', '识图文本', 'ocrText'],
  relatedIds: ['relatedIds', '关联题目', 'relatedQuestionIds'],
  externalId: ['externalId', '外部ID', 'sourceId'],
  importBatchId: ['importBatchId', '导入批次']
};

async function ensureAdmin() {
  const wxContext = cloud.getWXContext();
  const res = await db.collection('admins').where({
    openid: wxContext.OPENID,
    enabled: true
  }).limit(1).get();
  return {
    isAdmin: Array.isArray(res.data) && res.data.length > 0,
    openid: wxContext.OPENID
  };
}

function splitMulti(value, sep = /[|,，\n]/) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split(sep).map((item) => item.trim()).filter(Boolean);
}

function buildAliasMap(fieldMappings = {}) {
  const aliasMap = {};
  Object.keys(BASE_FIELD_ALIASES).forEach((key) => {
    aliasMap[key] = (BASE_FIELD_ALIASES[key] || []).slice();
  });
  Object.keys(fieldMappings || {}).forEach((targetField) => {
    const extra = Array.isArray(fieldMappings[targetField])
      ? fieldMappings[targetField]
      : String(fieldMappings[targetField] || '').split(/[|,，\n]/).map((item) => item.trim()).filter(Boolean);
    aliasMap[targetField] = Array.from(new Set((aliasMap[targetField] || []).concat(extra)));
  });
  return aliasMap;
}

function pickField(raw = {}, key, aliasMap = BASE_FIELD_ALIASES) {
  const aliasList = aliasMap[key] || [key];
  for (const alias of aliasList) {
    if (raw[alias] !== undefined && raw[alias] !== null && raw[alias] !== '') {
      return raw[alias];
    }
  }
  return '';
}

function normalizeTitle(title = '') {
  return String(title).replace(/[\s\-—_【】\[\]()（）]/g, '').toLowerCase();
}

function sanitizeStatus(status = '') {
  const value = String(status || '').trim().toLowerCase();
  if (['published', 'draft', 'deleted', 'review'].includes(value)) return value;
  return 'draft';
}

function sanitizeReviewStatus(value = '', status = 'draft') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['pending', 'approved', 'rejected'].includes(normalized)) return normalized;
  if (status === 'published') return 'approved';
  if (status === 'review') return 'pending';
  return 'pending';
}

function buildLifecycle(status = 'draft', reviewStatus = 'pending') {
  if (status === 'deleted') return 'archived';
  if (status === 'published') return reviewStatus === 'approved' ? 'published' : 'review';
  if (status === 'review') return 'review';
  return 'draft';
}

function buildFingerprint(item = {}) {
  return crypto.createHash('md5').update(JSON.stringify({
    title: item.title,
    content: item.content,
    answer: item.answer,
    subject: item.subject,
    category: item.category
  })).digest('hex');
}

function normalizeItem(raw = {}, openid = '', options = {}) {
  const now = Date.now();
  const aliasMap = options.aliasMap || BASE_FIELD_ALIASES;
  const status = sanitizeStatus(pickField(raw, 'status', aliasMap) || 'draft');
  const reviewStatus = sanitizeReviewStatus(pickField(raw, 'reviewStatus', aliasMap), status);
  const title = String(pickField(raw, 'title', aliasMap) || '').trim();
  const content = String(pickField(raw, 'content', aliasMap) || title).trim();
  const answer = String(pickField(raw, 'answer', aliasMap) || '').trim();
  const titleVariants = splitMulti(pickField(raw, 'titleVariants', aliasMap));
  const importBatchId = String(options.importBatchId || pickField(raw, 'importBatchId', aliasMap) || '').trim();
  const normalized = {
    title,
    content,
    answer,
    answerSummary: String(pickField(raw, 'answerSummary', aliasMap) || '').trim(),
    analysis: String(pickField(raw, 'analysis', aliasMap) || '').trim(),
    tags: splitMulti(pickField(raw, 'tags', aliasMap)),
    type: String(pickField(raw, 'type', aliasMap) || 'single').trim() || 'single',
    options: splitMulti(pickField(raw, 'options', aliasMap)),
    subject: String(pickField(raw, 'subject', aliasMap) || '').trim(),
    category: String(pickField(raw, 'category', aliasMap) || '').trim(),
    difficulty: String(pickField(raw, 'difficulty', aliasMap) || 'medium').trim() || 'medium',
    source: String(pickField(raw, 'source', aliasMap) || '').trim(),
    year: Number(pickField(raw, 'year', aliasMap)) || null,
    score: Number(pickField(raw, 'score', aliasMap)) || 0,
    status,
    reviewStatus,
    lifecycleState: buildLifecycle(status, reviewStatus),
    titleVariants,
    imageText: String(pickField(raw, 'imageText', aliasMap) || '').trim(),
    relatedIds: splitMulti(pickField(raw, 'relatedIds', aliasMap)),
    externalId: String(pickField(raw, 'externalId', aliasMap) || '').trim(),
    normalizedTitle: normalizeTitle(title),
    isDeleted: status === 'deleted',
    version: 1,
    lastAction: 'import',
    createdAt: now,
    updatedAt: now,
    createdBy: openid,
    updatedBy: openid,
    deletedAt: status === 'deleted' ? now : null,
    deletedBy: status === 'deleted' ? openid : '',
    deletedReason: status === 'deleted' ? 'imported as archived' : '',
    importMeta: {
      mode: options.importMode || 'paste',
      sourceType: options.sourceType || 'unknown',
      templateType: options.templateType || 'custom',
      batchId: importBatchId,
      importedAt: now,
      importedBy: openid,
      rowFingerprint: ''
    },
    statusHistory: [{
      at: now,
      by: openid,
      action: 'import',
      toStatus: status,
      toReviewStatus: reviewStatus,
      toLifecycleState: buildLifecycle(status, reviewStatus),
      reason: options.importReason || 'bulk import'
    }]
  };
  normalized.importMeta.rowFingerprint = buildFingerprint(normalized);
  return normalized;
}

function validateItem(item = {}) {
  const errors = [];
  const warnings = [];
  if (!item.title) errors.push('title required');
  if (!item.content) errors.push('content required');
  if (!item.answer) errors.push('answer required');
  if (!['single', 'multiple', 'qa'].includes(item.type)) errors.push('invalid type');
  if (!['easy', 'medium', 'hard'].includes(item.difficulty)) errors.push('invalid difficulty');
  if (!['published', 'draft', 'deleted', 'review'].includes(item.status)) errors.push('invalid status');
  if (!['pending', 'approved', 'rejected'].includes(item.reviewStatus)) errors.push('invalid reviewStatus');
  if (item.type !== 'qa' && !item.options.length) warnings.push('choice question without options');
  if (!item.answerSummary && item.answer.length > 24) warnings.push('answerSummary recommended for long answers');
  if (!item.subject) warnings.push('subject missing');
  if (!item.category) warnings.push('category missing');
  return { errors, warnings };
}

exports.main = async (event = {}) => {
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };

  const items = Array.isArray(event.items) ? event.items : [];
  const previewOnly = !!event.previewOnly;
  const dedupeStrategy = event.dedupeStrategy || 'skip';
  const aliasMap = buildAliasMap(event.fieldMappings || {});
  const importOptions = {
    aliasMap,
    sourceType: event.sourceType || 'paste',
    templateType: event.templateType || 'custom',
    importMode: event.importMode || 'staging',
    importBatchId: event.importBatchId || '',
    importReason: event.importReason || ''
  };

  if (!items.length) return { success: false, code: 400, message: 'items is required' };

  const existingRes = await db.collection('questions').field({ _id: true, title: true, normalizedTitle: true, status: true }).limit(500).get();
  const existing = Array.isArray(existingRes.data) ? existingRes.data : [];
  const existingMap = {};
  existing.forEach((item) => {
    const key = item.normalizedTitle || normalizeTitle(item.title || '');
    if (key) existingMap[key] = item;
  });

  const seenInBatch = new Set();
  const prepared = items.map((raw, index) => {
    const normalized = normalizeItem(raw, auth.openid, importOptions);
    const validation = validateItem(normalized);
    const duplicateKey = normalized.normalizedTitle;
    const duplicateExisting = duplicateKey && existingMap[duplicateKey] ? existingMap[duplicateKey] : null;
    const duplicateInBatch = duplicateKey && seenInBatch.has(duplicateKey);
    if (duplicateKey) seenInBatch.add(duplicateKey);
    const errors = validation.errors.slice();
    const warnings = validation.warnings.slice();
    if (duplicateExisting && dedupeStrategy === 'skip') errors.push('duplicate title in db');
    if (duplicateExisting && dedupeStrategy === 'update') warnings.push('duplicate title in db, will update existing');
    if (duplicateInBatch) errors.push('duplicate title in batch');
    return {
      index,
      raw,
      normalized,
      errors,
      warnings,
      duplicateExistingId: duplicateExisting ? duplicateExisting._id : ''
    };
  });

  const valid = prepared.filter((item) => !item.errors.length);
  const invalid = prepared.filter((item) => item.errors.length);

  if (previewOnly) {
    return {
      success: true,
      code: 0,
      message: 'preview',
      data: {
        total: prepared.length,
        valid: valid.length,
        invalid: invalid.length,
        deduplicated: prepared.filter((item) => item.duplicateExistingId).length,
        sourceType: importOptions.sourceType,
        templateType: importOptions.templateType,
        dedupeStrategy,
        fieldMappings: Object.keys(aliasMap).reduce((acc, key) => {
          acc[key] = aliasMap[key].slice(0, 6);
          return acc;
        }, {}),
        preview: prepared.slice(0, 8).map((item) => ({
          index: item.index,
          title: item.normalized.title,
          subject: item.normalized.subject,
          type: item.normalized.type,
          difficulty: item.normalized.difficulty,
          status: item.normalized.status,
          reviewStatus: item.normalized.reviewStatus,
          lifecycleState: item.normalized.lifecycleState,
          duplicateExistingId: item.duplicateExistingId,
          warnings: item.warnings,
          errors: item.errors
        })),
        errors: invalid.slice(0, 30).map((item) => ({ index: item.index, title: item.normalized.title, errors: item.errors })),
        warnings: prepared.filter((item) => item.warnings.length).slice(0, 30).map((item) => ({ index: item.index, title: item.normalized.title, warnings: item.warnings }))
      }
    };
  }

  try {
    const insertedIds = [];
    const updatedIds = [];
    for (const item of valid) {
      if (item.duplicateExistingId && dedupeStrategy === 'update') {
        const currentRes = await db.collection('questions').doc(item.duplicateExistingId).get();
        const current = currentRes.data || {};
        const nextVersion = Number(current.version || 1) + 1;
        const updatePayload = {
          ...item.normalized,
          version: nextVersion,
          updatedAt: Date.now(),
          updatedBy: auth.openid,
          createdAt: current.createdAt || item.normalized.createdAt,
          createdBy: current.createdBy || item.normalized.createdBy,
          statusHistory: (current.statusHistory || []).concat(item.normalized.statusHistory || []).slice(-20)
        };
        await db.collection('questions').doc(item.duplicateExistingId).update({ data: updatePayload });
        updatedIds.push(item.duplicateExistingId);
      } else {
        const res = await db.collection('questions').add({ data: item.normalized });
        insertedIds.push(res._id);
      }
    }
    return {
      success: true,
      code: 0,
      message: 'imported',
      data: {
        inserted: insertedIds.length,
        updated: updatedIds.length,
        failed: invalid.length,
        ids: insertedIds,
        updatedIds,
        errors: invalid.map((item) => ({ index: item.index, title: item.normalized.title, errors: item.errors })),
        warnings: prepared.filter((item) => item.warnings.length).map((item) => ({ index: item.index, title: item.normalized.title, warnings: item.warnings }))
      }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'import failed', error: error.message || error };
  }
};
