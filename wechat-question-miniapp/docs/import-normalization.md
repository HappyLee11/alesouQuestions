# 导入与归一化设计（v4）

这份文档描述当前 demo 已实现的“更像商用系统”的导入链路，以及真正上线时推荐怎么扩展。

## 1. 当前已实现的导入链路

### 1）暂存区（miniprogram/pages/import）

由于这里还没有接入微信小程序真实文件上传/解析能力，本版采用一个**可演示、可落地的 file-like staging flow**：

- 先在导入页选择模板类型：
  - 标准 JSON 数组
  - 异构字段 JSON
  - JSON Lines / 导出日志
  - CSV / 表格粘贴
  - XLSX/CSV 导入任务 Manifest（用 JSON 模拟 workbook staging）
- 把原始文本粘贴到暂存区
- 小程序本地先解析成 `stagingItems`
- 本地展示列集合、样例记录、记录数
- 再调用云函数做 `previewOnly=true` 预检
- 最后才正式导入

这相当于把“上传文件 → 解析 → 暂存 → 预检 → 入库”中的前半段，用文本暂存方式在 demo 中完整模拟出来。

### 2）云端预检（cloudfunctions/importQuestions）

预检阶段会做：

- 字段别名识别
- 自定义 `fieldMappings` 合并
- 归一化标题去重
- 基础必填校验
- 题型 / 难度 / 状态 / 审核状态校验
- 导入任务 / 文件 / sheet / row 元信息回传
- 治理字段补齐（owner / ownerTeam / reviewer / reviewComment / approvalPolicy）
- 预警输出（例如问答题摘要缺失、选择题缺 options、ownerTeam 缺失）
- 重复命中判断（skip / update）

### 3）正式导入

当预检通过后，再执行正式写库：

- 非重复：新增题目
- 重复且 `dedupeStrategy=update`：更新已有题，并提升 `version`
- 所有导入记录都会带上 `importMeta` 与 `statusHistory`

---

## 2. 标准字段模型

推荐所有外部模板最终归一到以下字段：

### 基础内容字段

- `title`
- `content`
- `answer`
- `analysis`
- `options`
- `type`
- `tags`

### 搜索增强字段

- `answerSummary`
- `titleVariants`
- `imageText`
- `relatedIds`

### 治理字段

- `status`：`draft | review | published | deleted`
- `reviewStatus`：`pending | approved | rejected`
- `lifecycleState`：`draft | review | published | archived`
- `source`
- `externalId`
- `version`
- `statusHistory`

### 导入字段

- `importMeta.mode`
- `importMeta.sourceType`
- `importMeta.templateType`
- `importMeta.batchId`
- `importMeta.importedAt`
- `importMeta.importedBy`
- `importMeta.rowFingerprint`
- `importMeta.taskId`
- `importMeta.taskName`
- `importMeta.taskStatus`
- `importMeta.fileName`
- `importMeta.fileType`
- `importMeta.sourceRef`
- `importMeta.sheetName`
- `importMeta.rowNumber`
- `importMeta.stagedAt`
- `importMeta.stagingChecksum`

### 治理字段

- `governance.owner`
- `governance.ownerTeam`
- `governance.reviewer`
- `governance.reviewComment`
- `governance.reviewUpdatedAt`
- `governance.reviewUpdatedBy`
- `governance.sourceRef`
- `governance.importTaskId`
- `governance.importTaskStatus`
- `governance.importSheet`
- `governance.importRowNumber`
- `governance.approvalPolicy`
- `governance.changeReason`

---

## 3. 当前支持的字段别名

| 标准字段 | 识别别名示例 |
| --- | --- |
| title | `title` / `题目` / `questionTitle` |
| content | `content` / `题干` / `description` |
| answer | `answer` / `答案` / `result` |
| answerSummary | `answerSummary` / `答案摘要` / `summary` |
| analysis | `analysis` / `解析` / `explanation` |
| tags | `tags` / `标签` / `tagList` |
| type | `type` / `题型` / `questionType` |
| options | `options` / `选项` / `choices` |
| subject | `subject` / `学科` / `科目` |
| category | `category` / `分类` / `章节` |
| difficulty | `difficulty` / `难度` / `level` |
| status | `status` / `状态` |
| reviewStatus | `reviewStatus` / `审核状态` |
| titleVariants | `titleVariants` / `标题变体` / `别名` / `aliases` |
| imageText | `imageText` / `识图文本` / `ocrText` |
| relatedIds | `relatedIds` / `关联题目` |
| externalId | `externalId` / `外部ID` / `sourceId` |

---

## 4. 多模板输入示例

### A. 标准 JSON

```json
[
  {
    "title": "React 为什么需要 key？",
    "content": "请解释列表渲染中 key 的作用。",
    "answer": "帮助框架稳定识别节点。",
    "type": "qa",
    "status": "review",
    "reviewStatus": "pending"
  }
]
```

### B. 异构 JSON

```json
[
  {
    "题目": "HTTPS 为什么更安全？",
    "题干": "请说明 HTTPS 的安全收益。",
    "答案": "TLS/SSL 加密、身份校验、完整性保护。",
    "标签": "HTTP|安全"
  }
]
```

### C. JSON Lines

```json
{"questionTitle":"什么是 CDN？","description":"解释 CDN 的作用","result":"内容分发网络"}
{"questionTitle":"什么是缓存击穿？","description":"解释缓存击穿场景","result":"热点 key 失效后大量请求打到后端"}
```

### D. CSV / 表格粘贴

```csv
题目,题干,答案,标签,题型,学科,分类,难度,状态,审核状态
HTTP 为什么无状态,解释 HTTP 为什么被称为无状态协议,协议本身不保存会话上下文,HTTP|协议,qa,Web 基础,协议,medium,published,approved
```

### E. Workbook / XLSX 导入任务 Manifest

```json
{
  "sourceType": "xlsx-manifest",
  "task": {
    "taskId": "import-task-20260320-001",
    "fileName": "school-east-march.xlsx"
  },
  "defaults": {
    "status": "review",
    "reviewStatus": "pending",
    "ownerTeam": "内容运营"
  },
  "sheets": [
    {
      "sheetName": "问答题",
      "rows": [
        {
          "__rowNumber": 2,
          "questionTitle": "为什么需要 CDN？",
          "description": "请解释 CDN 的作用。",
          "result": "内容分发网络，用于就近分发与加速。"
        }
      ]
    }
  ]
}
```

---

## 5. fieldMappings 怎么用

如果机构 A 的模板把标题叫作 `试题名称`，可以在导入页补充：

```json
{
  "title": ["题目", "questionTitle", "试题名称"],
  "content": ["题干", "description", "正文"],
  "answer": ["答案", "result", "参考答案"]
}
```

云函数会把这部分映射和内置别名合并。

---

## 6. 去重策略

### `skip`

- 命中归一化标题重复时，直接报错跳过
- 适合首次批量入库或对覆盖更新敏感的场景

### `update`

- 命中重复时更新已有题目
- 自动提升 `version`
- 保留 `statusHistory`
- 适合已有题库周期性同步

---

## 7. 生产环境建议补齐

当前 demo 已足够演示思路，但真正商业化还建议补以下链路：

1. 真实文件上传：支持 xlsx / csv / zip / docx 转换结果
2. 导入任务中心：异步任务、进度、失败重试、错误报告下载
3. 映射模板中心：机构级模板保存与复用
4. 相似题工作台：不只查完全重复，也提示可能重复
5. 审核联动：导入后自动进入 `review` 状态，由审核员批量通过/驳回
6. 操作日志：记录谁在什么时候导入、更新、归档、恢复了什么
