# WeChat Question Search Mini Program

一个更接近预商用 v3 的微信小程序题库 Demo：既展示用户侧搜索体验，也展示管理员侧题目录入、归档恢复和批量导入治理。

## 这次 v3 强化的亮点

- 搜索不再只是关键词列表：补齐图片搜题入口占位、分组 / 筛选 / 排序、无结果兜底、答案摘要展开
- 详情页更像真实产品：支持标题变体展示、完整答案折叠、相关题推荐
- 示例题库更真实：增加 `titleVariants`、`answerSummary`、`imageText`、`relatedIds` 等搜索增强字段
- 导入流程更完整：支持异构字段别名、导入前预检、标题归一化去重、批量错误报告
- 云函数返回结构更像正式接口：`success/code/message/data`
- 搜索/详情仍保留 mock fallback，未完全部署云环境时仍可继续演示

## 功能概览

### 用户侧

- 首页卖点卡片与热词入口
- 题目关键词搜索 / 图片搜题入口占位
- 搜索历史与热门搜索
- 搜索结果高亮、排序、分组与筛选
- 无结果兜底建议
- 题目详情页（含元数据、标题变体、相关题）

### 管理侧

- 管理员权限校验
- 后台数据统计卡片
- 题目列表搜索与状态筛选
- 新增 / 编辑题目
- 题目归档与恢复（代替直接硬删除）
- 批量导入题目（字段别名映射、预检、去重、错误反馈）

## 目录结构

```text
wechat-question-miniapp/
├── miniprogram/
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── pages/
│   │   ├── home/
│   │   ├── search/
│   │   ├── detail/
│   │   ├── admin/
│   │   ├── import/
│   │   ├── list/
│   │   └── edit/
│   └── utils/
├── cloudfunctions/
│   ├── searchQuestions/
│   ├── getQuestionDetail/
│   ├── checkAdmin/
│   ├── saveQuestion/
│   ├── deleteQuestion/
│   └── importQuestions/
├── data/
├── docs/
└── project.config.json
```

## 快速开始

### 1. 环境准备

- 安装微信开发者工具
- 开通云开发环境
- 准备一个小程序 AppID（无 AppID 模式也可先调 UI）

### 2. 导入项目

推荐配置：

- 项目根目录：`wechat-question-miniapp`
- 小程序目录：`miniprogram`
- 云函数目录：`cloudfunctions`

### 3. 配置云环境 ID

需要修改：

- `miniprogram/app.js`
- `project.config.json`

### 4. 创建数据库集合

建议创建：

- `questions`
- `admins`

### 5. 部署云函数

在微信开发者工具中逐个部署：

- `searchQuestions`
- `getQuestionDetail`
- `checkAdmin`
- `saveQuestion`
- `deleteQuestion`
- `importQuestions`

### 6. 初始化数据

- 先导入 `data/sample-questions.json`
- 或者登录管理员后，直接在导入页粘贴 JSON 数组导入

## 当前推荐的数据模型

```json
{
  "title": "Redis 为什么适合做热点数据缓存？",
  "titleVariants": ["Redis 热点缓存原因", "缓存为什么用 Redis"],
  "content": "请从存储方式和访问速度的角度，解释 Redis 常用于缓存层的原因。",
  "answer": "内存存储、读写速度快",
  "answerSummary": "核心原因是内存存储、低延迟、高吞吐。",
  "analysis": "Redis 基于内存，QPS 高。",
  "tags": ["Redis", "缓存", "后端"],
  "type": "qa",
  "options": [],
  "subject": "后端开发",
  "category": "缓存",
  "difficulty": "medium",
  "source": "系统设计训练",
  "year": 2025,
  "score": 5,
  "status": "published",
  "imageText": "图片题干里有 Redis 热点数据缓存",
  "relatedIds": ["q4"],
  "isDeleted": false,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "createdBy": "openid",
  "updatedBy": "openid",
  "deletedAt": null,
  "deletedBy": "",
  "deletedReason": ""
}
```

## Demo 建议流程

1. **首页**：介绍这是一个题库检索 + 维护的小程序 Demo
2. **搜索页**：演示热门词、历史记录、图片搜题入口、分组/筛选/排序、空结果建议
3. **详情页**：展示更完整的题目元信息、答案展开、相关题
4. **后台首页**：展示管理员校验与统计卡片
5. **题目列表**：演示筛选、编辑、归档 / 恢复
6. **导入页**：粘贴异构 JSON，先做预检，再执行导入

## 已知限制

- 搜索云函数当前仍是 `limit(200)` 后过滤，超大题库需要改为索引/分页方案
- 图片搜题目前是演示入口，占位了 OCR → 关键词召回链路，尚未接真实识图能力
- CSV / Excel 目前只提供模板思路，尚未实现真实文件上传解析
- 搜索与详情保留 mock fallback，但管理动作仍要求真实管理员权限和云函数部署
- 导入映射目前以内置别名为主，真正商用还需要可视化映射 UI 与导入任务中心

## 文档

- `docs/setup.md`
- `docs/architecture.md`
- `docs/scenario-solution-v3.md`
- `data/sample-questions.json`
- `data/import-template.csv`
