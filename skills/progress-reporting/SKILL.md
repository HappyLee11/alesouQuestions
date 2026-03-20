---
name: progress-reporting
description: Report build or task progress in long-running work. Use when a user asks for periodic progress updates, milestone-based status updates, in-chat check-ins during extended coding or research tasks, or clearer summaries of what is done / in progress / blocked / next.
---

# Progress Reporting

Give concise, useful progress updates during long-running work.

## Default format

Use this structure when sending a progress update:

- done: what finished since the last update
- doing: what is currently in progress
- next: the next concrete step
- blockers: only if something is actually blocking progress

Keep updates short unless the user asks for detail.

## Timing rules

When the user requests periodic updates, treat it as a preference, not a guarantee.

- Send an update whenever a meaningful milestone completes.
- If the environment supports continued execution and messaging, try to match the requested cadence.
- If the environment does not guarantee wakeups or timed sends, say so once, then continue to provide updates whenever new progress is available or when the user checks in.
- Do not fabricate progress just to satisfy a timer.

## Long coding tasks

For coding or build work, include:

- files or modules touched
- feature area being improved
- whether the result is scaffold / demo-ready / production-ready
- the most important remaining gap

## Good update examples

- done: 搜索页已补上历史搜索和热门词；doing: 正在接结果分组和筛选；next: 处理无结果兜底文案。
- done: 已提交第二轮增强版；doing: 正在把导入流程改成预检查 + 去重；next: 补批量错误报告。

## Avoid

- empty updates with no new information
- exaggerated certainty about timers or completion times
- very long changelogs in routine progress pings

## References

For wording patterns and edge cases, read `references/patterns.md`.
