# Image Relinker README 标题修复设计

## 目标

保留 README 顶部的作者介绍和社交链接，同时使 README 的第一个且唯一一级标题与 manifest 名称 `Image Relinker` 完全一致。

## 变更

- 将顶部 `# Hi there 👋 I'm keyoneway` 改为 `**Hi there 👋 I'm keyoneway**`。
- 保留现有作者文案、社交链接、Featured Project 区块与中英插件说明。
- 保留 `# Image Relinker`，使其成为唯一一级标题。

## 范围

只修改 `README.md`。不改插件代码、manifest、版本号或 Release 资产。

## 验证

确认 README 仅有一个匹配 `^# ` 的标题，且其文本为 `Image Relinker`；确认远端 default branch 已收到变更。随后请求 Community Directory 重新扫描该分支或等待其自动扫描。
