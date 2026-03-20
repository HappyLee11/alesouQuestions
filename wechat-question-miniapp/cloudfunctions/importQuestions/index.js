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
  importBatchId: ['importBatchId', '导入批次'],
  owner: ['owner', '负责人', '题目负责人'],
  ownerTeam: ['ownerTeam', '负责团队', '归属团队'],
  reviewer: ['reviewer', '审核人'],
  reviewComment: ['reviewComment', '审核备注', '审核意见']
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
    category: item.category,
    externalId: item.externalId,
    source: item.source
  })).digest('hex');
}

function buildVersionSnapshot(item = {}, version = 1, action = 'import', reason = '') {
  return {
    version,
    at: Date.now(),
    by: item.updatedBy || item.createdBy || '',
    action,
    reason: reason || action,
    title: item.title,
    answerSummary: item.answerSummary,
    status: item.status,
    reviewStatus: item.reviewStatus,
    lifecycleState: item.lifecycleState,
    importBatchId: item.importMeta && item.importMeta.batchId ? item.importMeta.batchId : '',
    sourceType: item.importMeta && item.importMeta.sourceType ? item.importMeta.sourceType : '',
    taskId: item.importMeta && item.importMeta.taskId ? item.importMeta.taskId : ''
  };
}

function normalizeGovernance(raw = {}, aliasMap, openid = '', options = {}) {
  const now = Date.now();
  const owner = String(pickField(raw, 'owner', aliasMap) || options.defaultOwner || '').trim();
  const ownerTeam = String(pickField(raw, 'ownerTeam', aliasMap) || options.defaultOwnerTeam || '').trim();
  const reviewer = String(pickField(raw, 'reviewer', aliasMap) || options.defaultReviewer || '').trim();
  const reviewComment = String(pickField(raw, 'reviewComment', aliasMap) || options.defaultReviewComment || '').trim();
  return {
    owner,
    ownerTeam,
    reviewer,
    reviewComment,
    reviewUpdatedAt: reviewer || reviewComment ? now : null,
    reviewUpdatedBy: reviewer || reviewComment ? openid : '',
    sourceRef: String(options.sourceRef || '').trim(),
    importTaskId: String(options.taskId || '').trim(),
    importTaskStatus: String(options.taskStatus || '').trim() || 'validated',
    importSheet: String(options.sheetName || '').trim(),
    importRowNumber: Number(options.rowNumber) || null,
    approvalPolicy: String(options.approvalPolicy || '').trim() || 'manual-review',
    changeReason: String(options.importReason || '').trim() || 'bulk import'
  };
}

function normalizeItem(raw = {}, openid = '', options = {}) {
  const now = Date.now();
  const aliasMap = options.aliasMap || BASE_FIELD_ALIASES;
  const status = sanitizeStatus(pickField(raw, 'status', aliasMap) || options.defaultStatus || 'draft');
  const reviewStatus = sanitizeReviewStatus(pickField(raw, 'reviewStatus', aliasMap) || options.defaultReviewStatus, status);
  const title = String(pickField(raw, 'title', aliasMap) || '').trim();
  const content = String(pickField(raw, 'content', aliasMap) || title).trim();
  const answer = String(pickField(raw, 'answer', aliasMap) || '').trim();
  const titleVariants = splitMulti(pickField(raw, 'titleVariants', aliasMap));
  const importBatchId = String(options.importBatchId || pickField(raw, 'importBatchId', aliasMap) || '').trim();
  const importMeta = {
    mode: options.importMode || 'paste',
    sourceType: options.sourceType || 'unknown',
    templateType: options.templateType || 'custom',
    batchId: importBatchId,
    importedAt: now,
    importedBy: openid,
    rowFingerprint: '',
    taskId: String(options.taskId || '').trim(),
    taskName: String(options.taskName || '').trim(),
    taskStatus: String(options.taskStatus || '').trim() || 'validated',
    fileName: String(options.fileName || '').trim(),
    fileType: String(options.fileType || '').trim(),
    sourceRef: String(options.sourceRef || '').trim(),
    sheetName: String(options.sheetName || '').trim(),
    rowNumber: Number(options.rowNumber) || null,
    stagedAt: options.stagedAt || now,
    stagingChecksum: String(options.stagingChecksum || '').trim()
  };
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
    importMeta,
    governance: normalizeGovernance(raw, aliasMap, openid, options),
    statusHistory: [{
      at: now,
      by: openid,
      action: 'import',
      toStatus: status,
      toReviewStatus: reviewStatus,
      toLifecycleState: buildLifecycle(status, reviewStatus),
      reason: options.importReason || 'bulk import'
    }],
    versionSnapshots: []
  };
  normalized.importMeta.rowFingerprint = buildFingerprint(normalized);
  normalized.versionSnapshots = [buildVersionSnapshot(normalized, 1, 'import', options.importReason || 'bulk import')];
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
  if (!item.governance || !item.governance.ownerTeam) warnings.push('ownerTeam recommended for governance');
  if (item.status === 'published' && item.reviewStatus !== 'approved') warnings.push('published item should usually be approved');
  return { errors, warnings };
}

function flattenImportManifest(manifest = {}, globalOptions = {}) {
  const task = manifest.task || {};
  const defaults = manifest.defaults || {};
  const sheets = Array.isArray(manifest.sheets) ? manifest.sheets : [];
  const sourceRows = [];

  sheets.forEach((sheet, sheetIndex) => {
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    rows.forEach((row, rowIndex) => {
      sourceRows.push({
        raw: row,
        meta: {
          taskId: task.taskId || manifest.taskId || '',
          taskName: task.taskName || manifest.taskName || manifest.fileName || '',
          taskStatus: task.taskStatus || manifest.taskStatus || 'staged',
          fileName: task.fileName || manifest.fileName || '',
          fileType: task.fileType || manifest.fileType || manifest.sourceType || '',
          sourceRef: task.sourceRef || manifest.sourceRef || '',
          sheetName: sheet.sheetName || sheet.name || `Sheet${sheetIndex + 1}`,
          rowNumber: Number(row.__rowNumber || row.rowNumber) || rowIndex + 2,
          stagedAt: task.stagedAt || manifest.stagedAt || Date.now(),
          stagingChecksum: task.stagingChecksum || manifest.stagingChecksum || '',
          templateType: sheet.templateType || manifest.templateType || globalOptions.templateType || 'spreadsheet-sheet',
          sourceType: manifest.sourceType || globalOptions.sourceType || 'xlsx-manifest',
          importMode: globalOptions.importMode || manifest.importMode || 'staging',
          importBatchId: globalOptions.importBatchId || manifest.importBatchId || task.batchId || '',
          importReason: globalOptions.importReason || task.reason || 'bulk import',
          approvalPolicy: task.approvalPolicy || defaults.approvalPolicy || 'manual-review',
          defaultStatus: sheet.defaultStatus || defaults.status || 'draft',
          defaultReviewStatus: sheet.defaultReviewStatus || defaults.reviewStatus || 'pending',
          defaultOwner: sheet.defaultOwner || defaults.owner || '',
          defaultOwnerTeam: sheet.defaultOwnerTeam || defaults.ownerTeam || '',
          defaultReviewer: sheet.defaultReviewer || defaults.reviewer || '',
          defaultReviewComment: sheet.defaultReviewComment || defaults.reviewComment || ''
        }
      });
    });
  });

  return {
    task,
    sheets,
    sourceRows,
    fieldMappings: manifest.fieldMappings || {},
    templateType: manifest.templateType || globalOptions.templateType || 'spreadsheet-workbook',
    sourceType: manifest.sourceType || globalOptions.sourceType || 'xlsx-manifest'
  };
}

function normalizeSource(event = {}) {
  if (event.importManifest && typeof event.importManifest === 'object') {
    const flattened = flattenImportManifest(event.importManifest, event);
    return {
      items: flattened.sourceRows.map((entry) => entry.raw),
      perRowMeta: flattened.sourceRows.map((entry) => entry.meta),
      fieldMappings: {
        ...(flattened.fieldMappings || {}),
        ...(event.fieldMappings || {})
      },
      sourceType: flattened.sourceType,
      templateType: flattened.templateType,
      task: flattened.task,
      sheets: flattened.sheets
    };
  }
  const items = Array.isArray(event.items) ? event.items : [];
  return {
    items,
    perRowMeta: items.map(() => ({
      taskId: event.taskId || '',
      taskName: event.taskName || '',
      taskStatus: event.taskStatus || 'staged',
      fileName: event.fileName || '',
      fileType: event.fileType || event.sourceType || '',
      sourceRef: event.sourceRef || '',
      sheetName: event.sheetName || '',
      rowNumber: null,
      stagedAt: Date.now(),
      stagingChecksum: event.stagingChecksum || '',
      templateType: event.templateType || 'custom',
      sourceType: event.sourceType || 'paste',
      importMode: event.importMode || 'staging',
      importBatchId: event.importBatchId || '',
      importReason: event.importReason || '',
      approvalPolicy: event.approvalPolicy || 'manual-review',
      defaultStatus: event.defaultStatus || 'draft',
      defaultReviewStatus: event.defaultReviewStatus || 'pending',
      defaultOwner: event.defaultOwner || '',
      defaultOwnerTeam: event.defaultOwnerTeam || '',
      defaultReviewer: event.defaultReviewer || '',
      defaultReviewComment: event.defaultReviewComment || ''
    })),
    fieldMappings: event.fieldMappings || {},
    sourceType: event.sourceType || 'paste',
    templateType: event.templateType || 'custom',
    task: event.task || null,
    sheets: []
  };
}

exports.main = async (event = {}) => {
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };

  const normalizedSource = normalizeSource(event);
  const items = normalizedSource.items;
  const previewOnly = !!event.previewOnly;
  const dedupeStrategy = event.dedupeStrategy || 'skip';
  const aliasMap = buildAliasMap(normalizedSource.fieldMappings || {});

  if (!items.length) return { success: false, code: 400, message: 'items or importManifest is required' };

  const existingRes = await db.collection('questions').field({ _id: true, title: true, normalizedTitle: true, status: true, version: true, createdAt: true, createdBy: true, statusHistory: true, versionSnapshots: true }).limit(500).get();
  const existing = Array.isArray(existingRes.data) ? existingRes.data : [];
  const existingMap = {};
  existing.forEach((item) => {
    const key = item.normalizedTitle || normalizeTitle(item.title || '');
    if (key) existingMap[key] = item;
  });

  const seenInBatch = new Set();
  const prepared = items.map((raw, index) => {
    const rowMeta = normalizedSource.perRowMeta[index] || {};
    const normalized = normalizeItem(raw, auth.openid, {
      aliasMap,
      sourceType: rowMeta.sourceType || normalizedSource.sourceType || 'paste',
      templateType: rowMeta.templateType || normalizedSource.templateType || 'custom',
      importMode: rowMeta.importMode || event.importMode || 'staging',
      importBatchId: rowMeta.importBatchId || event.importBatchId || '',
      importReason: rowMeta.importReason || event.importReason || '',
      taskId: rowMeta.taskId || '',
      taskName: rowMeta.taskName || '',
      taskStatus: previewOnly ? 'previewed' : (rowMeta.taskStatus || 'validated'),
      fileName: rowMeta.fileName || '',
      fileType: rowMeta.fileType || '',
      sourceRef: rowMeta.sourceRef || '',
      sheetName: rowMeta.sheetName || '',
      rowNumber: rowMeta.rowNumber || null,
      stagedAt: rowMeta.stagedAt || Date.now(),
      stagingChecksum: rowMeta.stagingChecksum || '',
      approvalPolicy: rowMeta.approvalPolicy || event.approvalPolicy || 'manual-review',
      defaultStatus: rowMeta.defaultStatus || event.defaultStatus || 'draft',
      defaultReviewStatus: rowMeta.defaultReviewStatus || event.defaultReviewStatus || 'pending',
      defaultOwner: rowMeta.defaultOwner || event.defaultOwner || '',
      defaultOwnerTeam: rowMeta.defaultOwnerTeam || event.defaultOwnerTeam || '',
      defaultReviewer: rowMeta.defaultReviewer || event.defaultReviewer || '',
      defaultReviewComment: rowMeta.defaultReviewComment || event.defaultReviewComment || ''
    });
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
      rowMeta,
      normalized,
      errors,
      warnings,
      duplicateExistingId: duplicateExisting ? duplicateExisting._id : ''
    };
  });

  const valid = prepared.filter((item) => !item.errors.length);
  const invalid = prepared.filter((item) => item.errors.length);
  const sheetSummaryMap = {};
  prepared.forEach((item) => {
    const key = item.rowMeta.sheetName || 'default';
    if (!sheetSummaryMap[key]) {
      sheetSummaryMap[key] = { sheetName: key, total: 0, valid: 0, invalid: 0 };
    }
    sheetSummaryMap[key].total += 1;
    if (item.errors.length) sheetSummaryMap[key].invalid += 1;
    else sheetSummaryMap[key].valid += 1;
  });

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
        sourceType: normalizedSource.sourceType,
        templateType: normalizedSource.templateType,
        dedupeStrategy,
        task: normalizedSource.task ? {
          taskId: normalizedSource.task.taskId || '',
          taskName: normalizedSource.task.taskName || normalizedSource.task.fileName || '',
          fileName: normalizedSource.task.fileName || '',
          fileType: normalizedSource.task.fileType || normalizedSource.sourceType,
          approvalPolicy: normalizedSource.task.approvalPolicy || 'manual-review'
        } : null,
        sheets: Object.keys(sheetSummaryMap).map((key) => sheetSummaryMap[key]),
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
          taskId: item.normalized.importMeta.taskId,
          fileName: item.normalized.importMeta.fileName,
          sheetName: item.normalized.importMeta.sheetName,
          rowNumber: item.normalized.importMeta.rowNumber,
          owner: item.normalized.governance.owner,
          ownerTeam: item.normalized.governance.ownerTeam,
          warnings: item.warnings,
          errors: item.errors
        })),
        errors: invalid.slice(0, 30).map((item) => ({ index: item.index, title: item.normalized.title, sheetName: item.normalized.importMeta.sheetName, rowNumber: item.normalized.importMeta.rowNumber, errors: item.errors })),
        warnings: prepared.filter((item) => item.warnings.length).slice(0, 30).map((item) => ({ index: item.index, title: item.normalized.title, sheetName: item.normalized.importMeta.sheetName, rowNumber: item.normalized.importMeta.rowNumber, warnings: item.warnings }))
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
        const snapshot = buildVersionSnapshot(item.normalized, nextVersion, 'import-update', item.normalized.governance.changeReason);
        const updatePayload = {
          ...item.normalized,
          version: nextVersion,
          updatedAt: Date.now(),
          updatedBy: auth.openid,
          createdAt: current.createdAt || item.normalized.createdAt,
          createdBy: current.createdBy || item.normalized.createdBy,
          statusHistory: (current.statusHistory || []).concat(item.normalized.statusHistory || []).slice(-20),
          versionSnapshots: (current.versionSnapshots || []).concat([snapshot]).slice(-20)
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
        sourceType: normalizedSource.sourceType,
        templateType: normalizedSource.templateType,
        dedupeStrategy,
        task: normalizedSource.task ? {
          taskId: normalizedSource.task.taskId || '',
          taskName: normalizedSource.task.taskName || normalizedSource.task.fileName || ''
        } : null,
        sheets: Object.keys(sheetSummaryMap).map((key) => sheetSummaryMap[key]),
        errors: invalid.map((item) => ({ index: item.index, title: item.normalized.title, sheetName: item.normalized.importMeta.sheetName, rowNumber: item.normalized.importMeta.rowNumber, errors: item.errors })),
        warnings: prepared.filter((item) => item.warnings.length).map((item) => ({ index: item.index, title: item.normalized.title, sheetName: item.normalized.importMeta.sheetName, rowNumber: item.normalized.importMeta.rowNumber, warnings: item.warnings }))
      }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'import failed', error: error.message || error };
  }
};
