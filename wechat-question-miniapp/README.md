# 阿乐搜题 / WeChat Question Search Mini Program

一个更像**产品 Demo / 预商用原型**的微信小程序题库项目：既能展示用户侧搜题体验，也能展示管理员侧题库治理、批量导入、审核状态与生命周期管理。

> GitHub repo: `HappyLee11/alesouQuestions`  
> 当前仓库目录：`wechat-question-miniapp`

![overview](./assets/hero-overview.svg)

## 这是什么

这不是“只有一个搜索框 + 一个结果列表”的小程序样板，而是一套更完整的题库检索 Demo：

- **用户侧**：首页、搜题、结果分组/筛选/分页、标签筛选、命中字段提示、详情页、相关推荐
- **管理侧**：管理员校验、题目列表、编辑维护、归档恢复、快捷审核 / 驳回 / 发布、审核态与生命周期
- **导入侧**：JSON / JSONL / CSV / workbook manifest，多模板暂存、字段映射、治理默认值、云端预检、去重策略、最近任务回执
- **仓库侧**：README、架构说明、Demo 路线、视觉占位图，方便别人第一次打开仓库就看懂项目

## 项目亮点

### 1) 更像产品的搜题体验

- Landing / Home 页面有产品定位、推荐热词、Demo 路线
- 搜索页支持：
  - 关键词检索
  - 图片搜题入口占位（OCR 文本回填示例）
  - 高亮命中摘要
  - 学科 / 难度 / 题型 / 标签筛选
  - 命中字段提示与推荐继续搜索词
  - 分组视图 / 列表视图切换
  - 分页浏览
  - 空结果兜底建议
- 详情页补齐答案摘要、完整解析、标签和相关题跳转

![search](./assets/search-page-preview.svg)

### 2) 更像真实后台的内容治理能力

- 管理员权限校验
- 生命周期与审核状态统计
- 题目列表筛选、搜索、归档与恢复
- 列表内快捷提审 / 审核通过 / 驳回 / 发布
- 编辑页支持：
  - 标题变体 / OCR 文本
  - 来源引用 / 外部 ID
  - 负责人 / 团队 / 审核人
  - 审核备注 / 变更原因
  - 版本快照 / 状态流转

### 3) 更像正式系统的批量导入流程

- 支持 `JSON / JSONL / CSV / workbook manifest`
- 支持别名映射与自定义 `fieldMappings`
- 支持“本地暂存 → 云端预检 → 正式导入”三段式流程
- 支持治理默认值：默认状态 / 审核态 / 审批策略 / 负责人 / 团队 / 导入原因
- 支持 `skip / update` 去重策略
- 支持最近任务回执，便于把导入页讲成“轻量任务中心”
- 预检 / 导入会最佳努力写入 `import_tasks`，让后台首页能展示真实任务概览
- 导入后补齐 `importMeta` / `governance` / `statusHistory` / `versionSnapshots`，并记录审计日志

### 4) 更像商用后台的权限与审计能力

- `admins.role` 显式映射权限集合，而不只是 `isAdmin` 布尔值
- 后台首页展示角色权限矩阵，方便售前 / 方案演示
- 题目录入、更新、归档、恢复、导入预检、导入执行会最佳努力写入 `audit_logs`
- 后台首页可以直接看到最近导入任务和审计轨迹，形成“谁做了什么”的闭环
- 后台首页增加任务中心直达入口，把“概览页 → 工作台 → 处理页”的演示链路串起来
- 新增任务中心 / 审核工作台，把待审核队列、最近导入任务和审计日志集中成后台第二入口，更适合演示真实运营流
- 任务中心支持按待审核 / 已驳回 / 审核中聚焦队列，并可按权限直接快捷通过、驳回、发布

![admin-import](./assets/admin-import-preview.svg)

## 页面结构

```text
miniprogram/pages/
├── home    # Landing / 产品入口
├── search  # 搜题结果页
├── detail  # 题目详情页
├── admin   # 管理后台首页
├── list    # 题目列表
├── edit    # 新增/编辑题目
└── import  # 批量导入与预检
```

## 技术 / 架构概览

### 前端

- 微信小程序原生页面
- 页面位于 `miniprogram/pages/*`
- 公共样式集中在 `miniprogram/app.wxss`
- API 封装在 `miniprogram/utils/question.js`

### 云函数

- `searchQuestions`
- `getQuestionDetail`
- `checkAdmin`
- `saveQuestion`
- `deleteQuestion`
- `importQuestions`

### 数据层

建议使用云开发数据库：

- `questions`
- `admins`
- `import_tasks`（推荐，用于导入任务中心 / 预检回执）
- `audit_logs`（推荐，用于后台审计轨迹）

### 运行模式

- **搜索 / 详情**：支持 mock fallback，方便 UI 演示
- **管理动作**：需要真实云函数与管理员权限
- **导入动作**：需要真实 `importQuestions` 云函数

更多说明见：

- [`docs/setup.md`](./docs/setup.md)
- [`docs/first-run-checklist.md`](./docs/first-run-checklist.md)
- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/import-normalization.md`](./docs/import-normalization.md)
- [`docs/governance-model.md`](./docs/governance-model.md)
- [`docs/demo-script.md`](./docs/demo-script.md)

## 快速开始

### 1. 环境准备

你需要：

- 微信开发者工具
- 一个小程序 AppID（没有也可先用游客模式调 UI）
- 一个云开发环境（若要跑真实后台动作）

### 2. 导入项目

在微信开发者工具中导入：

- **项目根目录**：`wechat-question-miniapp`
- **小程序目录**：`miniprogram`
- **云函数目录**：`cloudfunctions`

### 3. 配置云环境 ID

把以下文件中的 `your-cloud-env-id` 改成真实值：

- `miniprogram/app.js`
- `project.config.json`

### 4. 创建数据库集合

创建：

- `questions`
- `admins`
- `import_tasks`（推荐，用于导入任务中心 / 预检回执）
- `audit_logs`（推荐，用于后台审计轨迹）

### 5. 部署云函数

在微信开发者工具中逐个部署：

- `searchQuestions`
- `getQuestionDetail`
- `checkAdmin`
- `saveQuestion`
- `deleteQuestion`
- `importQuestions`

### 6. 初始化数据

推荐先用这些文件：

- `data/sample-questions.json`
- `data/import-template.csv`
- `data/import-workbook-manifest.json`
- `data/question-governance-schema.json`

如果你是**上传成功后的第一次联调**，现在也可以直接在小程序导入页里使用：

- 一键填入 9 条演示 JSON
- 一键切换成 workbook 演示任务

这样可以更快跑通 `questions / import_tasks / audit_logs` 的首日链路。

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

## 建议 Demo 流程（3~5 分钟）

### 路线 A：产品演示

1. 从 **首页** 讲产品定位与入口
2. 进入 **搜索页**，演示热词、历史、高亮、筛选、分页
3. 打开 **详情页**，演示答案摘要、完整解析与相关推荐
4. 切到 **后台首页**，讲管理员与状态统计
5. 打开 **题目列表 / 编辑页**，讲生命周期与版本信息
6. 进入 **导入页**，讲预检、去重、导入回执

### 路线 B：技术实现演示

1. 先讲 `miniprogram/pages/*` 页面分层
2. 再讲 `utils/question.js` 如何封装云函数调用与 mock fallback
3. 最后讲 `cloudfunctions/*`、导入归一化与治理模型

## 数据模型摘要

推荐题目字段包含：

- 基础：`title` `content` `answer` `analysis` `tags` `type` `options`
- 检索：`subject` `category` `difficulty` `source` `year` `score`
- 搜索增强：`answerSummary` `titleVariants` `imageText` `relatedIds`
- 生命周期：`status` `reviewStatus` `lifecycleState` `version`
- 治理：`governance` `statusHistory` `versionSnapshots`
- 导入：`importMeta`

完整示例见：

- [`docs/setup.md`](./docs/setup.md)
- [`data/question-governance-schema.json`](./data/question-governance-schema.json)

## 当前适合继续迭代的方向

- 接入真实 OCR / 图片上传链路
- 搜索改为索引 / 游标分页，而不是大范围内存过滤
- 把 CSV / Excel 升级成真实文件上传解析
- 增加导入任务中心与操作日志
- 增加测试、页面校验与更细的错误提示
- 增加截图 / 真机录屏 GIF

## 仓库建议查看顺序

如果你第一次打开这个仓库，建议按下面顺序看：

1. `README.md`
2. `docs/demo-script.md`
3. `docs/setup.md`
4. `docs/architecture.md`
5. `miniprogram/pages/*`
6. `cloudfunctions/*`

## License

当前仓库未单独声明 License；如要公开分发，建议补充许可证说明。