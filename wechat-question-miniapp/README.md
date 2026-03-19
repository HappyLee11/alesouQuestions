# WeChat Question Search Mini Program MVP

一个可运行的微信小程序 MVP 骨架，用于题库检索、题目详情查看，以及简单的后台导入/编辑管理。

## 功能概览

- 首页入口
- 题目关键词搜索
- 题目详情页
- 管理后台入口
- 题目录入/编辑/删除
- 批量导入题目（JSON/CSV 思路）
- 云函数骨架：搜索、详情、管理员校验、保存、删除、导入

## 目录结构

```text
wechat-question-miniapp/
├── miniprogram/
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── pages/
│   │   ├── home/
│   │   ├── search/
│   │   ├── detail/
│   │   ├── admin/
│   │   ├── import/
│   │   ├── list/
│   │   └── edit/
│   └── utils/
├── cloudfunctions/
│   ├── searchQuestions/
│   ├── getQuestionDetail/
│   ├── checkAdmin/
│   ├── saveQuestion/
│   ├── deleteQuestion/
│   └── importQuestions/
├── data/
├── docs/
└── project.config.json
```

## 快速开始

### 1. 环境准备

- 安装微信开发者工具
- 开通云开发环境
- 使用小程序 AppID（没有的话可先用测试号/无 AppID 模式调试基础界面）

### 2. 导入项目

在微信开发者工具中导入本目录，推荐选择：
- 项目根目录：`wechat-question-miniapp`
- 小程序目录：`miniprogram`
- 云函数目录：`cloudfunctions`

### 3. 配置云环境 ID

需要修改以下位置中的 `your-cloud-env-id`：

- `miniprogram/app.js`
- `project.config.json`
- 如需固定环境，也可在各云函数部署时选择同一环境

### 4. 创建数据库集合

建议创建集合：

- `questions`
- `admins`

`questions` 文档示例：

```json
{
  "title": "下面哪个是 HTTP 状态码 404 的含义？",
  "content": "下面哪个是 HTTP 状态码 404 的含义？",
  "answer": "资源不存在",
  "analysis": "404 表示服务器找不到请求的资源。",
  "tags": ["HTTP", "网络基础"],
  "type": "single",
  "options": ["请求成功", "资源不存在", "服务器错误", "未授权"],
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

`admins` 文档示例：

```json
{
  "openid": "用户的_openid",
  "name": "管理员A",
  "role": "super_admin",
  "enabled": true
}
```

### 5. 部署云函数

在微信开发者工具里分别右键部署：

- `searchQuestions`
- `getQuestionDetail`
- `checkAdmin`
- `saveQuestion`
- `deleteQuestion`
- `importQuestions`

### 6. 运行说明

- 首页可进入搜索页与管理页
- 搜索页支持本地 mock + 云函数搜索
- 管理页会先调用 `checkAdmin`
- 若未配置管理员集合，后台会提示无权限

## MVP 实现策略

当前骨架强调：

- 页面结构完整
- 基础交互可跑通
- 云函数接口边界清晰
- 便于后续接数据库、鉴权、分页、审核流

## 已知限制

- 目前默认带有本地 mock 兜底，方便开发
- CSV 导入仅提供模板与云函数参数约定，解析逻辑较基础
- 后台权限校验依赖 `admins` 集合
- 富文本、图片、附件、审核流暂未实现

## 后续建议

1. 接入真实题库数据与分页搜索
2. 增加题目分类、难度、来源字段
3. 增加收藏/错题本/历史记录
4. 增加后台审核与操作日志
5. 增加单元测试和云函数集成测试

更多说明见：
- `docs/setup.md`
- `docs/architecture.md`
- `data/sample-questions.json`
- `data/import-template.csv`
