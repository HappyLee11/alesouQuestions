# Setup Guide

## 1. 导入到微信开发者工具

- 项目根目录：`wechat-question-miniapp`
- 小程序目录：`miniprogram`
- 云函数目录：`cloudfunctions`

## 2. 配置云环境

把以下位置中的 `your-cloud-env-id` 替换为真实云环境：

- `miniprogram/app.js`
- `project.config.json`

## 3. 创建集合

- `questions`
- `admins`

## 4. questions 集合推荐字段

```json
{
  "title": "HTTPS 相比 HTTP 主要增加了什么能力？",
  "content": "HTTPS 在 HTTP 的基础上通过什么机制提高了传输安全性？",
  "answer": "TLS/SSL 加密",
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

`checkAdmin` 会返回当前 `openid`，方便你第一次配置管理员时核对。

## 6. 初始化示例数据

- 可用 `data/sample-questions.json` 作为导入样例
- 导入页支持直接粘贴 JSON 数组
- `data/import-template.csv` 提供字段模板，便于后续扩展真正 CSV 上传

## 7. 部署云函数

在微信开发者工具中逐个部署：

- `searchQuestions`
- `getQuestionDetail`
- `checkAdmin`
- `saveQuestion`
- `deleteQuestion`
- `importQuestions`

## 8. Demo 建议检查项

- 搜索页：热词 / 历史 / 高亮 / 排序
- 详情页：题目元信息展示是否正常
- 管理页：管理员校验与统计卡片
- 列表页：归档与恢复
- 导入页：JSON 预览与导入结果提示
