const { callFunction } = require('./request');
const mock = require('./mock');

async function searchQuestions(keyword) {
  const result = await callFunction('searchQuestions', { keyword });
  if (result && !result.__mockFallback && result.success) {
    return result.data || [];
  }
  return mock.search(keyword);
}

async function getQuestionDetail(id) {
  const result = await callFunction('getQuestionDetail', { id });
  if (result && !result.__mockFallback && result.success) {
    return result.data || null;
  }
  return mock.getById(id);
}

async function checkAdmin() {
  const result = await callFunction('checkAdmin');
  if (result && !result.__mockFallback) {
    return !!result.isAdmin;
  }
  return false;
}

async function saveQuestion(payload) {
  const result = await callFunction('saveQuestion', payload, { useMockOnFail: false });
  return result;
}

async function deleteQuestion(id) {
  const result = await callFunction('deleteQuestion', { id }, { useMockOnFail: false });
  return result;
}

async function importQuestions(items) {
  const result = await callFunction('importQuestions', { items }, { useMockOnFail: false });
  return result;
}

module.exports = {
  searchQuestions,
  getQuestionDetail,
  checkAdmin,
  saveQuestion,
  deleteQuestion,
  importQuestions
};
