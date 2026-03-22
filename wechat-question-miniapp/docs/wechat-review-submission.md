# 阿乐题库小程序 · 微信提审提交包

> 用途：把当前仓库整理成一份可直接在微信开发者工具 / 微信开放平台照单执行的提审材料。

## 一、提审对象

- **项目名**：阿乐题库
- **AppID**：`wx33b53b8c2d9d1fda`
- **项目根目录**：`wechat-question-miniapp`
- **小程序目录**：`miniprogram`
- **云函数目录**：`cloudfunctions`
- **云环境 ID**：`cloudbase-6gffo8cld63d6b10`

## 二、建议提审版本

- **Version**：`0.1.3`
- **Version Description**：`补齐首页、任务中心、导入页、后台总览、编辑页、详情页治理闭环，完善题库运营工作台体验`

## 三、本次提审重点

### 1. 用户侧体验

- 首页支持搜索框、热门搜索、最近搜索、按学科找题
- 搜索结果页支持关键词检索与筛选
- 详情页支持答案摘要、完整答案、解析、相关题目

### 2. 管理侧闭环

- 后台总览支持风险提醒 / 收口快照
- 任务中心支持待审核队列、导入任务、风险与验收提示
- 导入页支持预检、回执恢复、闭环建议
- 编辑页支持风险下钻与一键定位修复
- 详情页支持治理快照与编辑直达

### 3. 演示价值

本版本不仅能展示“搜题”，还可展示：

- 后台治理
- 内容审核
- 批量导入
- 风险处理
- 验收收口

更接近一套可演示的题库产品，而不只是单页 Demo。

## 四、建议审核说明

可直接使用下面这段作为提审说明初稿：

> 阿乐题库是一款用于题目检索、答案查看与题库管理的小程序。用户侧可通过首页搜索、热门搜索、最近搜索和详情页查看题目答案与解析；管理侧支持后台权限校验、题目维护、批量导入、审核队列、风险提示与任务中心闭环管理。本次版本重点补齐首页、任务中心、导入页、后台总览、编辑页与详情页之间的治理链路，提升可交付和可演示完整度。

## 五、建议审核路径

### 用户侧主路径

1. 打开首页：`pages/home/index`
2. 搜索任意关键词，例如：`闭包`
3. 进入搜索结果页：`pages/search/index`
4. 进入详情页：`pages/detail/index`

### 管理侧展示路径

1. 进入后台页：`pages/admin/index`
2. 查看任务中心：`pages/task-center/index`
3. 进入导入页：`pages/import/index`
4. 查看题目列表：`pages/list/index`
5. 进入编辑页：`pages/edit/index`

## 六、上传前核对清单

### 基础配置

- [ ] 微信开发者工具已登录正确小程序主体
- [ ] AppID 确认无误：`wx33b53b8c2d9d1fda`
- [ ] 云环境 ID 确认无误：`cloudbase-6gffo8cld63d6b10`
- [ ] `project.config.json` 与 `miniprogram/app.js` 使用同一云环境

### 云开发准备

- [ ] 已创建 `questions`
- [ ] 已创建 `admins`
- [ ] 已创建 `import_tasks`
- [ ] 已创建 `audit_logs`
- [ ] 已部署云函数：
  - [ ] `searchQuestions`
  - [ ] `getQuestionDetail`
  - [ ] `checkAdmin`
  - [ ] `saveQuestion`
  - [ ] `deleteQuestion`
  - [ ] `importQuestions`

### 管理员能力

- [ ] `admins` 集合中已写入当前审核账号的管理员记录
- [ ] 后台页可识别为管理员
- [ ] 任务中心可拉到审核队列 / 最近任务 / 审计日志

### 数据与演示

- [ ] 首页搜索正常
- [ ] 搜索结果正常
- [ ] 详情页可正常打开
- [ ] 后台总览风险快照正常
- [ ] 导入页可做一次预检
- [ ] 编辑页可保存题目
- [ ] 详情页可跳编辑页 / 任务中心 / 导入页

## 七、建议提交前版本依据

本次代码基础建议至少包含以下提交：

- `c203586` `feat(miniapp): add admin shortcut workspace on home`
- `0d92af4` `feat(miniapp): upgrade task center workflow`
- `906b8ca` `feat(miniapp): add actionable admin todo shortcuts`
- `ab9877d` `feat(miniapp): add task-center risk and acceptance insights`
- `5c79965` `feat(miniapp): improve import closure guidance`
- `0dceac6` `feat(miniapp): add admin workbench risk snapshot`
- `b5fff99` `feat(miniapp): add editor risk drilldown guidance`
- `27dc8ed` `feat(miniapp): add governance snapshot on detail page`
- `046e2cd` `chore(miniapp): add preview asset generator`

## 八、建议审核截图素材

建议至少准备以下页面截图：

1. 首页
2. 搜索结果页
3. 详情页
4. 后台总览
5. 任务中心
6. 导入页
7. 编辑页

当前仓库已有可参考效果图：

- `assets/hero-overview.png`
- `assets/hero-overview.svg`
- `assets/search-page-preview.svg`
- `assets/admin-import-preview.svg`
- `/tmp/miniapp-previews/home-preview.png`
- `/tmp/miniapp-previews/task-center-preview.png`
- `/tmp/miniapp-previews/import-preview.png`
- `/tmp/miniapp-previews/admin-preview.png`
- `/tmp/miniapp-previews/edit-preview.png`
- `/tmp/miniapp-previews/detail-preview.png`
- `/tmp/miniapp-previews/all-pages-overview.png`

## 九、当前仍需人工完成的最后一步

由于当前这台机器没有微信开发者工具，也没有直接可操作微信开放平台审核提审的登录环境，所以**真正点击“上传”与“提交审核”这一步，仍需在已登录微信开发者工具的环境中完成**。

换句话说：

- **代码与提审材料**：已基本推进到位
- **平台按钮点击提交**：需在微信官方工具环境完成

## 十、建议操作顺序

1. 在微信开发者工具中导入项目
2. 确认 AppID / 云环境 / 云函数 / 数据集合
3. 跑一遍首页 → 搜索 → 详情 → 后台 → 任务中心 → 导入页 → 编辑页
4. 填写版本号 `0.1.3`
5. 使用上面的版本说明与审核说明
6. 上传代码
7. 在微信开放平台填写截图、说明、服务类目与隐私信息后提交审核
