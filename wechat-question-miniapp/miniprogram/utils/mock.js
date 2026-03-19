const sampleQuestions = [
  {
    _id: 'q1',
    title: 'HTTP 404 表示什么？',
    content: 'HTTP 404 表示什么？',
    answer: '资源不存在',
    analysis: '404 表示请求的资源未找到。',
    tags: ['HTTP', '基础'],
    type: 'single',
    options: ['请求成功', '资源不存在', '服务器错误', '未授权']
  },
  {
    _id: 'q2',
    title: 'CSS 中用于设置文字颜色的属性是？',
    content: 'CSS 中用于设置文字颜色的属性是？',
    answer: 'color',
    analysis: 'color 用于设置文本颜色。',
    tags: ['CSS'],
    type: 'single',
    options: ['font-color', 'text-color', 'color', 'foreground']
  },
  {
    _id: 'q3',
    title: 'JavaScript 中声明常量通常使用什么关键字？',
    content: 'JavaScript 中声明常量通常使用什么关键字？',
    answer: 'const',
    analysis: 'const 用于声明块级作用域常量。',
    tags: ['JavaScript'],
    type: 'single',
    options: ['var', 'let', 'const', 'static']
  }
];

function search(keyword = '') {
  const text = keyword.trim().toLowerCase();
  if (!text) return sampleQuestions;
  return sampleQuestions.filter((item) => {
    return [item.title, item.content, item.answer, (item.tags || []).join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(text);
  });
}

function getById(id) {
  return sampleQuestions.find((item) => item._id === id) || null;
}

module.exports = {
  sampleQuestions,
  search,
  getById
};
