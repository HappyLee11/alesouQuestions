const IMPORT_TASKS_KEY = 'question-import-task-receipts';

function loadLocalReceipts(limit = 8) {
  const list = wx.getStorageSync(IMPORT_TASKS_KEY) || [];
  return list.slice(0, limit).map(normalizeLocalReceipt);
}

function normalizeLocalReceipt(item = {}) {
  return {
    ...item,
    localReceiptId: item.createdAt ? String(item.createdAt) : '',
    resumable: !!(item.snapshot && item.snapshot.text)
  };
}

function getReceiptById(receiptId) {
  if (!receiptId) return null;
  const list = loadLocalReceipts(20);
  return list.find((item) => String(item.localReceiptId) === String(receiptId)) || null;
}

function findMatchingLocalReceipt(task = {}) {
  const list = loadLocalReceipts(20);
  return list.find((item) => {
    if (task.taskId && item.taskId && task.taskId === item.taskId) return true;
    if (task.batchId && item.batchId && task.batchId === item.batchId) {
      if (!task.stagingChecksum || !item.stagingChecksum) return true;
      return task.stagingChecksum === item.stagingChecksum;
    }
    return false;
  }) || null;
}

function attachLocalReceiptHints(list = []) {
  return (Array.isArray(list) ? list : []).map((item) => {
    const localReceipt = findMatchingLocalReceipt(item);
    return {
      ...item,
      localReceiptId: localReceipt ? localReceipt.localReceiptId : '',
      resumable: !!(localReceipt && localReceipt.resumable)
    };
  });
}

module.exports = {
  IMPORT_TASKS_KEY,
  loadLocalReceipts,
  normalizeLocalReceipt,
  getReceiptById,
  findMatchingLocalReceipt,
  attachLocalReceiptHints
};
