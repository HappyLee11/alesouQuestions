# WeChat Question Search Mini Program

一个更接近预商用 v4 的微信小程序题库 Demo：既展示用户侧搜索体验，也展示管理员侧题目录入、审核 / 生命周期治理、归档恢复和批量导入治理。

## 这次 v4 强化的亮点

- **导入更像真实系统**：支持 JSON / JSONL / CSV 文本暂存，也支持 workbook manifest 方式模拟 XLSX/CSV 文件导入任务，先本地解析 / 暂存，再云端预检，再正式导入
- **数据归一化更完整**：支持内置别名 + 自定义 `fieldMappings`，补齐 `reviewStatus`、`lifecycleState`、`version`、`importMeta`、`governance`、`versionSnapshots`
- **搜索接口更正式**：增加 `pagination` / `request` / `excerpt` / `matchedFields` / `searchScore`
- **前端搜索体验更完整**：补齐分页浏览、结果摘要与正式接口风格返回
- **后台治理更严谨**：编辑页支持摘要、标题变体、OCR 文本、关联题、审核状态；归档恢复保留原状态

## 功能概览

### 用户侧

- 首页卖点卡片与热词入口
- 题目关键词搜索 / 图片搜题入口占位
- 搜索历史与热门搜索
- 搜索结果高亮、排序、分组与筛选
- 正式化分页返回与翻页演示
- 无结果兜底建议
- 题目详情页（含元数据、标题变体、相关题）

### 管理侧

- 管理员权限校验
- 后台数据统计卡片（发布 / 草稿 / 待审核 / 回收站 / 审核态）
- 题目列表搜索与状态筛选
- 新增 / 编辑题目
- 生命周期与审核状态管理
- 题目归档与恢复（代替直接硬删除）
- 批量导入题目（本地暂存、多模板解析、字段别名映射、预检、去重、错误反馈）

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
- 或者先参考 `data/import-workbook-manifest.json` 模拟 XLSX/CSV 导入任务
- 登录管理员后，在导入页粘贴 JSON / JSONL / CSV 文本，或直接粘贴 workbook manifest JSON

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
  "reviewStatus": "approved",
  "lifecycleState": "published",
  "imageText": "图片题干里有 Redis 热点数据缓存",
  "relatedIds": ["q4"],
  "version": 4,
  "governance": {
    "owner": "内容运营 A",
    "ownerTeam": "后端题库组",
    "reviewer": "审核员 B",
    "reviewComment": "导入后进入审核池",
    "approvalPolicy": "manual-review",
    "changeReason": "bulk import"
  },
  "isDeleted": false,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "createdBy": "openid",
  "updatedBy": "openid",
  "deletedAt": null,
  "deletedBy": "",
  "deletedReason": "",
  "importMeta": {
    "mode": "staging",
    "sourceType": "json-array",
    "templateType": "legacy-json",
    "batchId": "demo-batch-001"
  }
}
```

## Demo 建议流程

1. **首页**：介绍这是一个题库检索 + 治理后台的小程序 Demo
2. **搜索页**：演示热门词、历史记录、图片搜题入口、分组/筛选/分页、空结果建议
3. **详情页**：展示更完整的题目元信息、答案展开、相关题
4. **后台首页**：展示管理员校验与生命周期 / 审核态统计
5. **题目列表**：演示筛选、负责人 / 团队、导入批次、版本 / 审核态、归档 / 恢复
6. **编辑页**：演示外部来源、审核备注、变更原因、最近版本快照与状态流转
7. **导入页**：切换 JSON / JSONL / CSV / workbook manifest 模板，先做暂存预览，再云端预检，再执行导入

## 已知限制

- 搜索云函数当前仍是 `limit(500)` 后过滤，超大题库需要改为索引/分页方案
- 图片搜题目前是演示入口，占位了 OCR → 关键词召回链路，尚未接真实识图能力
- CSV / Excel 这里实现的是文本暂存解析，尚未实现真正文件上传解析
- 搜索与详情保留 mock fallback，但管理动作仍要求真实管理员权限和云函数部署
- 导入映射目前支持别名与 JSON 形式 `fieldMappings`，真正商用还需要可视化映射 UI 与导入任务中心

## 文档

- `docs/setup.md`
- `docs/architecture.md`
- `docs/import-normalization.md`
- `docs/governance-model.md`
- `docs/scenario-solution-v3.md`
- `data/sample-questions.json`
- `data/import-template.csv`
- `data/import-workbook-manifest.json`
- `data/question-governance-schema.json`
