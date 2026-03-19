# WeChat Question Search Mini Program

一个更适合演示的微信小程序题库 Demo：既能展示用户侧搜索体验，也能展示管理员侧的题目录入、归档恢复和批量导入。

## 这次增强后的亮点

- 统一了首页、搜索页、详情页、后台页的视觉与组件风格
- 搜索体验补齐：热词、历史记录、关键词高亮、基础排序
- 示例题库更真实：题目增加学科、分类、难度、来源、年份、分值、状态等字段
- 后台流程更完整：列表筛选、编辑录入、批量导入、软删除（归档）/恢复
- 云函数返回结构更像正式接口：`success/code/message/data`
- 默认搜索/详情仍保留 mock fallback，方便未部署完全时继续演示

## 功能概览

### 用户侧

- 首页卖点卡片与热词入口
- 题目关键词搜索
- 搜索历史与热门搜索
- 搜索结果高亮与排序
- 题目详情页（含元数据展示）

### 管理侧

- 管理员权限校验
- 后台数据统计卡片
- 题目列表搜索与状态筛选
- 新增 / 编辑题目
- 题目归档与恢复（代替直接硬删除）
- 批量导入题目（粘贴 JSON 数组）

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

## 当前推荐的题目数据模型

```json
{
  "title": "Redis 为什么适合做热点数据缓存？",
  "content": "请从存储方式和访问速度的角度，解释 Redis 常用于缓存层的原因。",
  "answer": "内存存储、读写速度快",
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
2. **搜索页**：演示热门词、搜索历史、结果高亮、排序切换
3. **详情页**：展示更完整的题目元信息
4. **后台首页**：展示管理员校验与统计卡片
5. **题目列表**：演示筛选、编辑、归档 / 恢复
6. **导入页**：粘贴 JSON，展示批量导入结果

## 已知限制

- 搜索云函数当前为了简单演示，先取有限数据再做本地过滤，超大题库需要改成索引/分页方案
- CSV 目前只提供模板，尚未实现真实文件上传解析
- 搜索与详情保留 mock fallback，但管理动作仍要求真实管理员权限和云函数部署
- 归档恢复目前恢复到 `published`，若后续需要恢复原状态，可补充 `previousStatus` 字段

## 文档

- `docs/setup.md`
- `docs/architecture.md`
- `data/sample-questions.json`
- `data/import-template.csv`
