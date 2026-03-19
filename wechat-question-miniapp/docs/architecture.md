# Architecture Notes

## Frontend pages

- `pages/home`: 首页介绍、热词入口、演示卖点
- `pages/search`: 搜索框、热门词、搜索历史、结果高亮、排序切换
- `pages/detail`: 题目详情、元数据展示（学科/分类/难度/来源/年份/分值）
- `pages/admin`: 管理员校验、后台统计卡片、快捷入口
- `pages/list`: 后台题目列表、状态筛选、软删除（归档）/恢复
- `pages/edit`: 题目录入/编辑，支持更完整的数据模型
- `pages/import`: 粘贴 JSON 批量导入，包含导入预览与结果反馈

## Data flow

1. UI 调用 `miniprogram/utils/question.js`
2. 工具层通过 `wx.cloud.callFunction` 访问云函数
3. 搜索与详情在本地开发模式下仍保留 mock fallback，方便明早演示
4. 管理动作（保存、归档/恢复、导入）要求真实云函数和 `admins` 权限

## Question model

推荐字段：

- 基础：`title` `content` `answer` `analysis` `tags` `type` `options`
- 检索/运营：`subject` `category` `difficulty` `source` `year` `score`
- 生命周期：`status` `isDeleted` `createdAt` `updatedAt` `createdBy` `updatedBy`
- 软删除：`deletedAt` `deletedBy` `deletedReason`
- 可选扩展：`viewCount` `favoriteCount` `reviewStatus`

## Cloud function behavior

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
    "summary": {
      "published": 10,
      "draft": 2,
      "deleted": 1
    }
  }
}
```

### `deleteQuestion`

不再直接物理删除，默认改为“归档”：

- `restore=false` → `status=deleted`、写入删除原因和时间
- `restore=true` → 恢复为 `published`

这样更安全，也更适合演示后台可恢复操作。

## Recommended next iterations

- 接入分页与数据库索引
- 将 CSV 上传解析补齐为真正文件导入
- 增加操作日志、审核流、收藏/错题本
- 为搜索页补充筛选器（学科、难度、题型）
- 增加云函数/页面级测试
