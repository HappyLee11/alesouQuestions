# Governance / Import Task Model

这份文档补充 v4 之后更接近预商用的一层：**导入不再只是“把题写进 questions 集合”**，而是围绕导入任务、sheet/row 暂存定位、题目治理字段、版本快照做更清晰的模型设计。

## 1. 导入任务模型（建议）

当前 demo 还没有单独落 `import_tasks` 集合，但云函数和前端契约已经按这个方向设计：

```json
{
  "taskId": "import-task-20260320-001",
  "taskName": "区域题库月度增量导入",
  "taskStatus": "staged",
  "fileName": "region-bank-2026-03.xlsx",
  "fileType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "sourceRef": "cos://question-imports/region-bank-2026-03.xlsx",
  "approvalPolicy": "manual-review"
}
```

### 为什么这很重要

真实系统里，经常需要回答这些问题：

- 这批题是谁什么时候导进来的？
- 原始文件是哪一个？
- 某一条错误对应的是哪个 sheet / 哪一行？
- 这批题是“直接上线”还是“导入后进入审核池”？

因此 demo 里现在会把这些信息写进每条题目的 `importMeta` / `governance` 中，便于继续演进到真正的任务中心。

---

## 2. Workbook / XLSX-oriented staging contract

由于这里没接入真实二进制解析，当前推荐用 **manifest JSON** 模拟 workbook staging：

```json
{
  "sourceType": "xlsx-manifest",
  "templateType": "spreadsheet-workbook",
  "task": { "taskId": "import-task-20260320-001" },
  "defaults": { "status": "review", "reviewStatus": "pending" },
  "sheets": [
    {
      "sheetName": "单选题",
      "rows": [
        { "__rowNumber": 2, "题目": "HTTP 301 表示什么？" }
      ]
    }
  ]
}
```

这样即使 demo 里不直接解 XLSX，也已经把未来正式链路里最关键的结构表达出来：

- **文件级**：fileName / fileType / sourceRef
- **任务级**：taskId / taskName / taskStatus / approvalPolicy
- **sheet 级**：sheetName / templateType
- **row 级**：rowNumber / fieldMappings / defaults

后续如果补接真实文件上传，只需把“上传后解析结果”落成同样的 manifest，就能复用现有预检 / 导入逻辑。

---

## 3. 题目治理字段

建议题目文档至少带下面这层治理信息：

```json
{
  "governance": {
    "owner": "内容运营 A",
    "ownerTeam": "后端题库组",
    "reviewer": "审核员 B",
    "reviewComment": "导入后进入审核池",
    "sourceRef": "sheet://region-bank-2026-03/问答题/12",
    "importTaskId": "import-task-20260320-001",
    "importTaskStatus": "validated",
    "importSheet": "问答题",
    "importRowNumber": 12,
    "approvalPolicy": "manual-review",
    "changeReason": "补充治理字段"
  }
}
```

### 用途

- `owner` / `ownerTeam`：明确这题归谁维护
- `reviewer` / `reviewComment`：记录审核责任与意见
- `sourceRef`：定位到外部模板来源
- `importTaskId`：串起整条导入链路
- `approvalPolicy`：明确是自动放行还是人工审核
- `changeReason`：避免“有人改了，但不知道为什么改”

---

## 4. 版本与审计

当前 demo 已经把版本模型从单纯的 `version` 数字，推进到两个辅助结构：

### `statusHistory`

记录生命周期 / 审核流转：

- import
- create
- update
- archive
- restore

### `versionSnapshots`

记录每次关键变更后的轻量快照：

- version
- action
- reason
- title
- answerSummary
- status / reviewStatus / lifecycleState
- owner / ownerTeam / reviewer

这使后台可以回答：

- 这题现在是第几版？
- 最近一次变更是导入、人工编辑、归档还是恢复？
- 是谁因为哪个原因改的？

---

## 5. 推荐的产品化后台流

### A. 导入专员

1. 上传或粘贴原始文件
2. 形成 staging manifest
3. 预检字段映射 / 重复 / 缺失项
4. 生成导入批次

### B. 审核员

1. 按批次或 ownerTeam 进入审核池
2. 查看导入来源、sheet、row、原始说明
3. 批量通过 / 驳回 / 补备注

### C. 内容运营

1. 查看题目列表中的 ownerTeam / importBatch / 版本
2. 进入编辑页维护答案摘要、OCR 文本、关联题
3. 查看最近版本快照与状态流转

---

## 6. 下一步推荐

如果继续往预商用推进，优先级建议：

1. 新增 `import_tasks` 集合与任务详情页
2. 支持错误报告导出 / 下载
3. 增加相似题检测，不只看完全重复标题
4. 审核列表按 `ownerTeam` / `batchId` / `taskId` 聚合
5. 搜索服务改为索引分页，而不是 `limit(500)` 后本地过滤
