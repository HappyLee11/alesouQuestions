# Architecture Notes

## Frontend pages

- `pages/home`: 用户首页、首屏搜索框、热词入口、最近搜索、学科快捷入口
- `pages/search`: 搜索框、热词、历史记录、结果高亮、筛选/分页、答案摘要展开
- `pages/detail`: 题目详情、完整元数据、标题变体、答案收起/展开、相关题推荐
- `pages/admin`: 管理员校验、后台统计卡片、生命周期与审核态概览、角色权限矩阵、最近导入任务与审计日志
- `pages/list`: 后台题目列表、状态筛选、软删除（归档）/恢复、版本/审核态展示
- `pages/edit`: 题目录入/编辑，支持更完整的数据模型与治理字段
- `pages/import`: 本地暂存导入，支持 JSON / JSONL / CSV 文本解析，也支持 workbook manifest 模拟 XLSX/CSV 导入任务；包含字段别名映射、预检、去重与错误反馈

## User-side search state model

推荐前端保留这些状态，而不是只有 `keyword + list`：

- 查询态：`keyword` `searchMode(keyword|image)` `sortBy`
- 缩窄态：`subject` `difficulty` `type` `groupBy`
- 结果态：`items` `groupedItems` `facets` `suggestions` `total`
- 分页态：`page` `pageSize` `totalPages` `hasPrev` `hasMore`
- 体验态：`history` `loading` `expandMap` `emptyReason`

这样才能覆盖真实用户场景：

1. **图片搜题**：先把 OCR/识别文本写回 `keyword`，再沿用同一搜索链路。
2. **结果过多**：使用 `facets` 提示用户进一步缩小范围。
3. **答案过载**：列表中先展示 `answerSummary`，详情页再展开完整答案与解析。
4. **找不到结果**：基于 tags/subject/category 给出兜底建议词。
5. **结果很多**：通过 `pagination` 显式翻页，而不是一次返回全部。

## Data flow

1. UI 调用 `miniprogram/utils/question.js`
2. 工具层通过 `wx.cloud.callFunction` 访问云函数
3. 搜索与详情在本地开发模式下保留 mock fallback，方便未完全部署时演示
4. 管理动作（保存、归档/恢复、导入）要求真实云函数和 `admins` 权限
5. 导入流程推荐走 **本地暂存 → 云端预检 → 正式导入** 三阶段
6. 导入预检 / 导入执行会最佳努力写入 `import_tasks`；保存 / 归档 / 恢复 / 导入会最佳努力写入 `audit_logs`

## Question model

推荐字段：

- 基础：`title` `content` `answer` `analysis` `tags` `type` `options`
- 检索/运营：`subject` `category` `difficulty` `source` `year` `score`
- 搜索增强：`answerSummary` `titleVariants` `imageText` `relatedIds`
- 生命周期：`status` `reviewStatus` `lifecycleState` `version` `statusHistory`
- 软删除：`isDeleted` `deletedAt` `deletedBy` `deletedReason` `previousStatus`
- 审计/导入：`createdAt` `updatedAt` `createdBy` `updatedBy` `importMeta`
- 治理/版本：`governance` `versionSnapshots`
- 可选扩展：`viewCount` `favoriteCount`

## Search cloud function behavior

### `searchQuestions`

返回结构：

```json
{
  "success": true,
  "code": 0,
  "message": "ok",
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "keyword": "http",
    "sortBy": "relevance",
    "searchMode": "keyword",
    "request": {
      "filters": {
        "subject": "Web 基础",
        "difficulty": "medium",
        "type": "qa"
      }
    },
    "pagination": {
      "page": 1,
      "totalPages": 1,
      "hasPrev": false,
      "hasMore": false,
      "nextPage": null
    },
    "summary": {
      "published": 10,
      "draft": 2,
      "review": 1,
      "deleted": 1
    },
    "facets": {
      "subject": [{ "value": "Web 基础", "count": 6 }],
      "difficulty": [{ "value": "medium", "count": 4 }],
      "reviewStatus": [{ "value": "approved", "count": 8 }]
    },
    "suggestions": ["HTTP", "安全", "协议"]
  }
}
```

每个搜索结果 item 额外带：

- `searchScore`
- `matchedFields`
- `excerpt`
- `badges`

## Import pipeline behavior

### `importQuestions`

关键能力：

- 支持多种列名别名：`题目 / questionTitle / title`
- 支持 `fieldMappings` 合并自定义别名
- 支持 workbook manifest：可表达 `task / file / sheet / row`
- 标题归一化去重：便于识别“空格不同、括号不同、轻微标题变体”
- `previewOnly=true` 时返回预检报告，不真正写入
- `dedupeStrategy=skip|update` 可控制重复题处理策略
- 批量错误输出统一为 `[{ index, title, sheetName, rowNumber, errors }]`
- 批量预警输出统一为 `[{ index, title, sheetName, rowNumber, warnings }]`
- 导入成功后补齐 `importMeta`、`governance`、`statusHistory`、`versionSnapshots`

## Recommended next iterations

- 接入真实 OCR/图片上传链路，而不是演示入口
- 搜索改为数据库索引 + 真正游标/索引分页，而不是 `limit(500)` 后过滤
- 将 CSV / Excel 上传解析补齐为真正文件导入
- 增加操作日志、审核流、题目版本历史详情
- 为管理端增加更完整的映射 UI、批量修复 UI、导入任务记录
- 增加云函数/页面级测试
