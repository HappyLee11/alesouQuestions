const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const FIELD_ALIASES = {
  title: ['title', '题目', '题干标题', 'questionTitle', 'name'],
  content: ['content', '题干', 'question', 'description', 'body'],
  answer: ['answer', '答案', 'result'],
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
  titleVariants: ['titleVariants', '标题变体', '别名', 'aliases'],
  imageText: ['imageText', '识图文本', 'ocrText']
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

function pickField(raw = {}, key) {
  const aliasList = FIELD_ALIASES[key] || [key];
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

function normalizeItem(raw = {}, openid = '') {
  const now = Date.now();
  const status = String(pickField(raw, 'status') || 'draft').trim() || 'draft';
  const title = String(pickField(raw, 'title') || '').trim();
  const content = String(pickField(raw, 'content') || title).trim();
  const answer = String(pickField(raw, 'answer') || '').trim();
  return {
    title,
    content,
    answer,
    analysis: String(pickField(raw, 'analysis') || '').trim(),
    tags: splitMulti(pickField(raw, 'tags')),
    type: String(pickField(raw, 'type') || 'single').trim() || 'single',
    options: splitMulti(pickField(raw, 'options')),
    subject: String(pickField(raw, 'subject') || '').trim(),
    category: String(pickField(raw, 'category') || '').trim(),
    difficulty: String(pickField(raw, 'difficulty') || 'medium').trim() || 'medium',
    source: String(pickField(raw, 'source') || '').trim(),
    year: Number(pickField(raw, 'year')) || null,
    score: Number(pickField(raw, 'score')) || 0,
    status,
    titleVariants: splitMulti(pickField(raw, 'titleVariants')),
    imageText: String(pickField(raw, 'imageText') || '').trim(),
    normalizedTitle: normalizeTitle(title),
    isDeleted: status === 'deleted',
    createdAt: now,
    updatedAt: now,
    createdBy: openid,
    updatedBy: openid,
    deletedAt: status === 'deleted' ? now : null,
    deletedBy: status === 'deleted' ? openid : '',
    deletedReason: status === 'deleted' ? 'imported as archived' : ''
  };
}

function validateItem(item = {}) {
  const errors = [];
  if (!item.title) errors.push('title required');
  if (!item.content) errors.push('content required');
  if (!item.answer) errors.push('answer required');
  if (!['single', 'multiple', 'qa'].includes(item.type)) errors.push('invalid type');
  if (!['easy', 'medium', 'hard'].includes(item.difficulty)) errors.push('invalid difficulty');
  if (!['published', 'draft', 'deleted'].includes(item.status)) errors.push('invalid status');
  return errors;
}

exports.main = async (event = {}) => {
  const auth = await ensureAdmin();
  if (!auth.isAdmin) return { success: false, code: 403, message: 'forbidden' };

  const items = Array.isArray(event.items) ? event.items : [];
  const previewOnly = !!event.previewOnly;
  const dedupeStrategy = event.dedupeStrategy || 'skip';
  if (!items.length) return { success: false, code: 400, message: 'items is required' };

  const existingRes = await db.collection('questions').field({ _id: true, title: true, normalizedTitle: true }).limit(200).get();
  const existing = Array.isArray(existingRes.data) ? existingRes.data : [];
  const existingMap = {};
  existing.forEach((item) => {
    const key = item.normalizedTitle || normalizeTitle(item.title || '');
    if (key) existingMap[key] = item;
  });

  const seenInBatch = new Set();
  const prepared = items.map((raw, index) => {
    const normalized = normalizeItem(raw, auth.openid);
    const errors = validateItem(normalized);
    const duplicateKey = normalized.normalizedTitle;
    const duplicateExisting = duplicateKey && existingMap[duplicateKey] ? existingMap[duplicateKey] : null;
    const duplicateInBatch = duplicateKey && seenInBatch.has(duplicateKey);
    if (duplicateKey) seenInBatch.add(duplicateKey);
    if (duplicateExisting && dedupeStrategy === 'skip') errors.push('duplicate title in db');
    if (duplicateInBatch) errors.push('duplicate title in batch');
    return {
      index,
      raw,
      normalized,
      errors,
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
        preview: prepared.slice(0, 5).map((item) => ({
          index: item.index,
          title: item.normalized.title,
          subject: item.normalized.subject,
          type: item.normalized.type,
          difficulty: item.normalized.difficulty,
          duplicateExistingId: item.duplicateExistingId,
          errors: item.errors
        })),
        errors: invalid.slice(0, 20).map((item) => ({ index: item.index, title: item.normalized.title, errors: item.errors }))
      }
    };
  }

  try {
    const insertedIds = [];
    const updatedIds = [];
    for (const item of valid) {
      if (item.duplicateExistingId && dedupeStrategy === 'update') {
        const updatePayload = {
          ...item.normalized,
          updatedAt: Date.now(),
          updatedBy: auth.openid
        };
        delete updatePayload.createdAt;
        delete updatePayload.createdBy;
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
        errors: invalid.map((item) => ({ index: item.index, title: item.normalized.title, errors: item.errors }))
      }
    };
  } catch (error) {
    return { success: false, code: 500, message: 'import failed', error: error.message || error };
  }
};
