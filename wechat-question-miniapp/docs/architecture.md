# Architecture Notes

## Frontend pages

- `pages/home`: 首页介绍、热词入口、演示卖点
- `pages/search`: 搜索框、热词、历史记录、图片搜题入口占位、结果高亮、分组/筛选/排序切换、答案摘要展开
- `pages/detail`: 题目详情、完整元数据、标题变体、答案收起/展开、相关题推荐
- `pages/admin`: 管理员校验、后台统计卡片、快捷入口
- `pages/list`: 后台题目列表、状态筛选、软删除（归档）/恢复
- `pages/edit`: 题目录入/编辑，支持更完整的数据模型
- `pages/import`: 粘贴 JSON 批量导入，支持异构字段预览、字段别名映射、预检、去重与错误反馈

## User-side search state model

推荐前端保留这些状态，而不是只有 `keyword + list`：

- 查询态：`keyword` `searchMode(keyword|image)` `sortBy`
- 缩窄态：`subject` `difficulty` `type` `groupBy`
- 结果态：`items` `groupedItems` `facets` `suggestions` `total`
- 体验态：`history` `loading` `expandMap` `emptyReason`

这样才能覆盖真实用户场景：

1. **图片搜题**：先把 OCR/识别文本写回 `keyword`，再沿用同一搜索链路。
2. **结果过多**：使用 `facets` 提示用户进一步缩小范围。
3. **答案过载**：列表中先展示 `answerSummary`，详情页再展开完整答案与解析。
4. **找不到结果**：基于 tags/subject/category 给出兜底建议词。

## Data flow

1. UI 调用 `miniprogram/utils/question.js`
2. 工具层通过 `wx.cloud.callFunction` 访问云函数
3. 搜索与详情在本地开发模式下保留 mock fallback，方便未完全部署时演示
4. 管理动作（保存、归档/恢复、导入）要求真实云函数和 `admins` 权限
5. 导入流程推荐走 **本地预览 → 云端预检 → 正式导入** 三阶段

## Question model

推荐字段：

- 基础：`title` `content` `answer` `analysis` `tags` `type` `options`
- 检索/运营：`subject` `category` `difficulty` `source` `year` `score`
- 搜索增强：`answerSummary` `titleVariants` `imageText` `relatedIds`
- 生命周期：`status` `isDeleted` `createdAt` `updatedAt` `createdBy` `updatedBy`
- 软删除：`deletedAt` `deletedBy` `deletedReason`
- 可选扩展：`viewCount` `favoriteCount` `reviewStatus`

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
    "keyword": "http",
    "sortBy": "relevance",
    "searchMode": "keyword",
    "summary": {
      "published": 10,
      "draft": 2,
      "deleted": 1
    },
    "facets": {
      "subject": [{ "value": "Web 基础", "count": 6 }],
      "difficulty": [{ "value": "medium", "count": 4 }]
    },
    "suggestions": ["HTTP", "安全", "协议"]
  }
}
```

## Import pipeline behavior

### `importQuestions`

关键能力：

- 支持多种列名别名：`题目 / questionTitle / title`
- 标题归一化去重：便于识别“空格不同、括号不同、轻微标题变体”
- `previewOnly=true` 时返回预检报告，不真正写入
- `dedupeStrategy=skip|update` 可控制重复题处理策略
- 批量错误输出统一为 `[{ index, title, errors }]`

## Recommended next iterations

- 接入真实 OCR/图片上传链路，而不是演示入口
- 搜索改为数据库索引 + 分页，而不是 `limit(200)` 后过滤
- 将 CSV / Excel 上传解析补齐为真正文件导入
- 增加操作日志、审核流、题目版本历史
- 为管理端增加更完整的映射 UI、批量修复 UI、导入任务记录
- 增加云函数/页面级测试
