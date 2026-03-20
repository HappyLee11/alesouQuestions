# 阿乐搜题（alesouQuestions）

一个面向**微信小程序搜题场景**的项目仓库，目标是做成更像真实产品的题库检索与题库治理系统。

## 当前仓库里有什么

主项目目录：

- `wechat-question-miniapp/`

这个目录里已经包含：

- 用户侧搜题小程序页面
- 管理员题库管理页面
- 批量导入与预检流程
- 搜索、筛选、分页、分组等演示能力
- 审核状态、生命周期、版本快照、治理字段等准商用能力
- 一套持续补强中的文档说明

## 推荐先看哪里

如果你是第一次打开这个仓库，建议按这个顺序看：

1. `wechat-question-miniapp/README.md`
2. `wechat-question-miniapp/docs/setup.md`
3. `wechat-question-miniapp/docs/architecture.md`
4. `wechat-question-miniapp/docs/import-normalization.md`
5. `wechat-question-miniapp/docs/governance-model.md`

## 项目定位

这不是一个只有“输入框 + 搜索结果列表”的简单 demo。

目前已经在往下面这些方向持续打磨：

- **用户侧体验**：搜题、相关推荐、结果摘要、分页、筛选
- **管理员体验**：题目编辑、批量导入、字段映射、去重、错误定位
- **内容治理**：审核状态、生命周期、版本快照、负责人、团队归属
- **商用准备**：导入任务化、治理模型、搜索结构化返回、后续 OCR / 文件上传预留

## 当前状态

当前更准确的定位是：

- 已完成多轮迭代
- 已具备 **demo-ready / 准商用原型** 的基础形态
- 还在继续朝真正的商用级版本推进

## 后续重点

接下来最重要的方向主要是：

1. 真文件上传 / XLSX 解析
2. 更正式的大题库搜索底层
3. 审批流 / 权限 / 审计日志
4. 图片题 / OCR 链路

## 仓库说明

当前主要开发内容集中在：

- `wechat-question-miniapp/`

后续如果扩展 Web 管理后台、独立后端、检索服务等能力，也会继续在这个仓库里补充更完整的结构。
