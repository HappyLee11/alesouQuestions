const sampleQuestions = [
  {
    _id: 'q1',
    title: '下面哪个 HTTP 状态码表示“资源不存在”？',
    content: '用户访问一个已经删除的页面时，服务端通常返回哪个 HTTP 状态码？',
    answer: '404',
    analysis: '404 Not Found 表示服务器找不到请求对应的资源。',
    tags: ['HTTP', '网络基础', '前端'],
    type: 'single',
    options: ['200', '301', '404', '500'],
    subject: 'Web 基础',
    category: '协议',
    difficulty: 'easy',
    source: '校招模拟题',
    year: 2025,
    score: 2,
    status: 'published',
    createdAt: 1740000000000,
    updatedAt: 1742400000000,
    isDeleted: false,
    viewCount: 328,
    favoriteCount: 54
  },
  {
    _id: 'q2',
    title: 'JavaScript 中声明常量通常使用哪个关键字？',
    content: '在 ES6 及以上版本中，推荐使用哪个关键字声明不可重新赋值的变量？',
    answer: 'const',
    analysis: 'const 用于声明块级作用域常量，不能被重新赋值。',
    tags: ['JavaScript', '语法'],
    type: 'single',
    options: ['var', 'let', 'const', 'static'],
    subject: '前端开发',
    category: 'JavaScript',
    difficulty: 'easy',
    source: '前端训练营',
    year: 2024,
    score: 2,
    status: 'published',
    createdAt: 1740200000000,
    updatedAt: 1742300000000,
    isDeleted: false,
    viewCount: 412,
    favoriteCount: 66
  },
  {
    _id: 'q3',
    title: 'CSS 中设置文字颜色的属性是？',
    content: '若要把一段文字设置为蓝色，CSS 中应使用哪个属性？',
    answer: 'color',
    analysis: 'color 属性负责文本颜色；background-color 则控制背景色。',
    tags: ['CSS', '样式'],
    type: 'single',
    options: ['font-color', 'text-color', 'color', 'foreground'],
    subject: '前端开发',
    category: 'CSS',
    difficulty: 'easy',
    source: '内部题库',
    year: 2023,
    score: 2,
    status: 'published',
    createdAt: 1740300000000,
    updatedAt: 1742200000000,
    isDeleted: false,
    viewCount: 279,
    favoriteCount: 38
  },
  {
    _id: 'q4',
    title: 'MySQL 中用于分页的关键字组合通常是？',
    content: '查询第 2 页、每页 10 条数据时，常见 SQL 分页语法会使用哪组关键字？',
    answer: 'LIMIT 和 OFFSET',
    analysis: 'MySQL 常使用 LIMIT count OFFSET start 或 LIMIT start,count 实现分页。',
    tags: ['MySQL', '数据库'],
    type: 'single',
    options: ['GROUP BY 和 HAVING', 'LIMIT 和 OFFSET', 'ORDER BY 和 WHERE', 'COUNT 和 SUM'],
    subject: '后端开发',
    category: '数据库',
    difficulty: 'medium',
    source: '笔试真题整理',
    year: 2025,
    score: 3,
    status: 'published',
    createdAt: 1740400000000,
    updatedAt: 1742500000000,
    isDeleted: false,
    viewCount: 180,
    favoriteCount: 20
  },
  {
    _id: 'q5',
    title: 'HTTPS 相比 HTTP 主要增加了什么能力？',
    content: 'HTTPS 在 HTTP 的基础上通过什么机制提高了传输安全性？',
    answer: 'TLS/SSL 加密',
    analysis: 'HTTPS = HTTP + TLS/SSL，可以提供加密、身份校验和完整性保护。',
    tags: ['HTTP', '安全'],
    type: 'single',
    options: ['更快的传输速度', 'TLS/SSL 加密', '更少的请求头', '固定使用 80 端口'],
    subject: 'Web 基础',
    category: '安全',
    difficulty: 'medium',
    source: '面试高频题',
    year: 2025,
    score: 3,
    status: 'draft',
    createdAt: 1740500000000,
    updatedAt: 1742600000000,
    isDeleted: false,
    viewCount: 145,
    favoriteCount: 17
  },
  {
    _id: 'q6',
    title: '在 Vue 中，computed 的主要适用场景是什么？',
    content: '当某个值依赖已有状态计算得出，并且希望具备缓存特性时，应优先考虑什么？',
    answer: 'computed 计算属性',
    analysis: 'computed 适合声明式衍生状态，依赖未变化时会直接返回缓存结果。',
    tags: ['Vue', '框架'],
    type: 'single',
    options: ['watch', 'methods', 'computed', 'emit'],
    subject: '前端开发',
    category: 'Vue',
    difficulty: 'medium',
    source: '项目复盘题单',
    year: 2024,
    score: 3,
    status: 'published',
    createdAt: 1740600000000,
    updatedAt: 1742650000000,
    isDeleted: false,
    viewCount: 199,
    favoriteCount: 25
  },
  {
    _id: 'q7',
    title: 'Redis 为什么适合做热点数据缓存？',
    content: '请从存储方式和访问速度的角度，解释 Redis 常用于缓存层的原因。',
    answer: '内存存储、读写速度快',
    analysis: 'Redis 基于内存，QPS 高，适合存放热点数据，但仍需结合持久化和淘汰策略。',
    tags: ['Redis', '缓存', '后端'],
    type: 'qa',
    options: [],
    subject: '后端开发',
    category: '缓存',
    difficulty: 'medium',
    source: '系统设计训练',
    year: 2025,
    score: 5,
    status: 'published',
    createdAt: 1740700000000,
    updatedAt: 1742700000000,
    isDeleted: false,
    viewCount: 132,
    favoriteCount: 12
  },
  {
    _id: 'q8',
    title: 'Nginx 反向代理的一个典型作用是？',
    content: '在常见 Web 架构中，Nginx 作为反向代理可以帮助应用实现什么能力？',
    answer: '负载均衡与统一入口转发',
    analysis: 'Nginx 常用于静态资源分发、反向代理、负载均衡和网关入口。',
    tags: ['Nginx', '运维', '架构'],
    type: 'single',
    options: ['本地持久化', '负载均衡与统一入口转发', '替代数据库事务', '直接编译前端代码'],
    subject: '运维与架构',
    category: '网关',
    difficulty: 'hard',
    source: '社招面试题',
    year: 2024,
    score: 4,
    status: 'deleted',
    isDeleted: true,
    deletedAt: 1742750000000,
    deletedReason: '重复录入示例',
    createdAt: 1740800000000,
    updatedAt: 1742750000000,
    viewCount: 75,
    favoriteCount: 7
  }
];

function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

function calcRelevance(item, keyword) {
  if (!keyword) return 0;
  const content = [
    item.title,
    item.content,
    item.answer,
    item.analysis,
    item.subject,
    item.category,
    item.source,
    (item.tags || []).join(' ')
  ].join(' ').toLowerCase();
  const query = keyword.toLowerCase();
  const hits = content.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
  return hits ? hits.length : 0;
}

function applySort(list, sortBy = 'relevance', keyword = '') {
  const copied = list.slice();
  if (sortBy === 'updatedAt') {
    return copied.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  if (sortBy === 'difficulty') {
    const weight = { easy: 1, medium: 2, hard: 3 };
    return copied.sort((a, b) => (weight[b.difficulty] || 0) - (weight[a.difficulty] || 0));
  }
  return copied.sort((a, b) => {
    const diff = calcRelevance(b, keyword) - calcRelevance(a, keyword);
    if (diff !== 0) return diff;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

function search(params = {}) {
  const options = typeof params === 'string' ? { keyword: params } : params;
  const keyword = String(options.keyword || '').trim().toLowerCase();
  const status = options.status || 'published';
  const includeDeleted = !!options.includeDeleted || status === 'all' || options.management;
  const sortBy = options.sortBy || 'relevance';

  let list = sampleQuestions.filter((item) => {
    if (!includeDeleted && (item.isDeleted || item.status === 'deleted')) return false;
    if (status !== 'all' && status && item.status !== status) return false;
    if (!keyword) return true;
    return [
      item.title,
      item.content,
      item.answer,
      item.analysis,
      item.subject,
      item.category,
      item.source,
      (item.tags || []).join(' ')
    ].join(' ').toLowerCase().includes(keyword);
  });

  return applySort(list.map(clone), sortBy, keyword);
}

function getById(id, options = {}) {
  const item = sampleQuestions.find((question) => question._id === id);
  if (!item) return null;
  if (!options.includeDeleted && (item.isDeleted || item.status === 'deleted')) return null;
  return clone(item);
}

module.exports = {
  sampleQuestions,
  search,
  getById
};
