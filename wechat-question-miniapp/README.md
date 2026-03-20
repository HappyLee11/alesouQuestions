# 阿乐搜题 / WeChat Question Search Mini Program

面向微信小程序场景的题库检索与内容运营项目。产品入口以用户搜题为核心：打开即搜索、查看结果、进入详情；题目治理、批量导入与审计能力集中在后台页面与配套文档中。

> GitHub repo: `HappyLee11/alesouQuestions`

![阿乐搜题首页预览](./assets/hero-overview.png)

## 产品预览

### 用户首页

![阿乐搜题首页效果图](./assets/hero-overview.svg)

- 首页首屏直接提供搜索框
- 支持热门搜索、最近搜索、按学科找题
- 入口文案保持用户视角，避免运营说明干扰主路径

### 搜索结果页

![搜题结果页效果图](./assets/search-page-preview.svg)

- 支持关键词检索与结果高亮
- 可按学科、难度、题型、标签继续筛选
- 列表先展示答案摘要，再按需展开解析或进入详情

### 后台与导入工作台

![后台与导入预览](./assets/admin-import-preview.svg)

- 管理员权限校验
- 题目维护、审核、归档与恢复
- 批量导入、预检回执、任务续做与审计记录

## 核心能力

### 用户侧

- 搜题首页与快捷入口
- 搜索结果分页、排序、筛选
- 题目详情页：答案、解析、来源、标签、相关题目
- 最近搜索记录

### 管理侧

- 管理员校验与角色权限
- 题目列表、编辑、生命周期管理
- 批量导入与预检
- 最近任务回执恢复
- 审计日志与后台概览

## 页面结构

```text
miniprogram/pages/
├── home        # 用户首页 / 搜索入口
├── search      # 搜索结果页
├── detail      # 题目详情页
├── admin       # 管理后台首页
├── task-center # 后台任务中心
├── list        # 题目列表
├── edit        # 新增/编辑题目
└── import      # 批量导入与预检
```

## 快速开始

### 1. 环境准备

需要：

- 微信开发者工具
- 一个小程序 AppID（也可先使用游客模式调试界面）
- 一个云开发环境（用于真实后台动作）

### 2. 导入项目

在微信开发者工具中导入：

- **项目根目录**：`wechat-question-miniapp`
- **小程序目录**：`miniprogram`
- **云函数目录**：`cloudfunctions`

### 3. 配置云环境 ID

将以下文件中的云环境 ID 替换为实际值：

- `miniprogram/app.js`
- `project.config.json`

### 4. 创建数据库集合

建议创建：

- `questions`
- `admins`
- `import_tasks`
- `audit_logs`

### 5. 部署云函数

在微信开发者工具中逐个部署：

- `searchQuestions`
- `getQuestionDetail`
- `checkAdmin`
- `saveQuestion`
- `deleteQuestion`
- `importQuestions`

### 6. 初始化数据

可先使用以下数据文件完成首批导入：

- `data/sample-questions.json`
- `data/import-template.csv`
- `data/import-workbook-manifest.json`
- `data/question-governance-schema.json`

### 7. 配置管理员

在 `admins` 集合中添加一条记录：

```json
{
  "openid": "your-openid",
  "name": "Primary Admin",
  "enabled": true,
  "role": "super_admin"
}
```

## 运行说明

### 数据来源

- **搜索 / 详情**：优先读取云端；云端不可用时回退到内置题库数据，便于本地联调
- **管理动作**：需要真实云函数与管理员权限
- **导入动作**：需要真实 `importQuestions` 云函数

### 推荐阅读

- [`docs/setup.md`](./docs/setup.md)
- [`docs/first-run-checklist.md`](./docs/first-run-checklist.md)
- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/import-normalization.md`](./docs/import-normalization.md)
- [`docs/governance-model.md`](./docs/governance-model.md)
- [`docs/release-prep-0.1.2.md`](./docs/release-prep-0.1.2.md)

## 仓库查看顺序

1. `README.md`
2. `docs/setup.md`
3. `docs/architecture.md`
4. `miniprogram/pages/home`
5. `miniprogram/pages/search`
6. `miniprogram/pages/detail`
7. `miniprogram/pages/admin`
8. `cloudfunctions/*`

## License

当前仓库未单独声明 License；如需公开分发，建议补充许可证说明。
