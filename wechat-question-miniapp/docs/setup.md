# Setup Guide

这份文档按“第一次把项目跑起来”的顺序整理。

## 1. 导入到微信开发者工具

导入配置：

- **项目根目录**：`wechat-question-miniapp`
- **小程序目录**：`miniprogram`
- **云函数目录**：`cloudfunctions`

## 2. 配置云环境

把以下位置中的 `your-cloud-env-id` 替换为真实云环境：

- `miniprogram/app.js`
- `project.config.json`

## 3. 创建集合

建议创建：

- `questions`
- `admins`
- `import_tasks`（推荐，若要展示导入任务中心）
- `audit_logs`（推荐，若要展示审计日志）

## 4. questions 集合推荐字段

```json
{
  "title": "HTTPS 相比 HTTP 主要增加了什么能力？",
  "content": "HTTPS 在 HTTP 的基础上通过什么机制提高了传输安全性？",
  "answer": "TLS/SSL 加密",
  "answerSummary": "核心能力是 TLS/SSL 加密与身份校验。",
  "analysis": "HTTPS = HTTP + TLS/SSL。",
  "tags": ["HTTP", "安全"],
  "type": "single",
  "options": ["更快的传输速度", "TLS/SSL 加密", "更少的请求头", "固定使用 80 端口"],
  "subject": "Web 基础",
  "category": "安全",
  "difficulty": "medium",
  "source": "面试高频题",
  "year": 2025,
  "score": 3,
  "status": "review",
  "reviewStatus": "pending",
  "lifecycleState": "review",
  "version": 1,
  "titleVariants": ["HTTPS 有什么提升"],
  "imageText": "图片识别题干片段",
  "relatedIds": ["q1"],
  "isDeleted": false,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "createdBy": "openid",
  "updatedBy": "openid",
  "deletedAt": null,
  "deletedBy": "",
  "deletedReason": "",
  "statusHistory": [],
  "importMeta": {
    "mode": "staging",
    "sourceType": "json-array",
    "templateType": "legacy-json",
    "batchId": "demo-batch-001"
  }
}
```

## 5. 管理员配置

在 `admins` 集合新增一条：

```json
{
  "openid": "your-openid",
  "name": "Primary Admin",
  "enabled": true,
  "role": "super_admin"
}
```

`checkAdmin` 会返回当前 `openid`，方便第一次配置管理员时核对。

## 6. 初始化示例数据

推荐先使用：

- `data/sample-questions.json`
- `data/import-template.csv`
- `data/import-workbook-manifest.json`

补充说明：

- 导入页支持直接粘贴 JSON / JSONL / CSV 文本到暂存区
- `data/import-template.csv` 提供字段模板
- 字段映射与归一化规则见 `docs/import-normalization.md`

## 7. 部署云函数

在微信开发者工具中逐个部署：

- `searchQuestions`
- `getQuestionDetail`
- `checkAdmin`
- `saveQuestion`
- `deleteQuestion`
- `importQuestions`
- `getAdminOverview`

## 8. 首次验证建议

### 用户侧

- 首页：热词、Demo 路线是否展示正常
- 搜索页：热词 / 历史 / 高亮 / 筛选 / 分页 / 结果摘要
- 详情页：题目元信息与相关推荐是否正常

### 管理侧

- 后台首页：管理员校验、统计卡片
- 列表页：版本、审核态、归档与恢复
- 编辑页：治理字段是否能正常保存
- 导入页：模板切换、本地预览、预检与导入结果提示

## 9. 如果只想先调 UI

即使你还没完全配好云环境，也可以先看不少界面：

- 搜索与详情页支持 mock fallback
- 首页、部分前端展示可直接预览
- 真正的管理动作 / 导入动作仍需要真实云函数

## 10. 推荐阅读顺序

第一次接手这个项目，建议按下面顺序看：

1. `README.md`
2. `docs/demo-script.md`
3. `docs/architecture.md`
4. `miniprogram/pages/*`
5. `cloudfunctions/*`
