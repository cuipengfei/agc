# realstars 摘录（alexdrydew/realstars）

> Source: https://github.com/alexdrydew/realstars README
> Collected: 2026-09-06
> Published: Unknown
> Type: excerpt（按 wiki 文章引用范围摘录）

- 形态：Chrome/Firefox 扩展（star 按钮旁内嵌信任徽章）+ Claude Code 插件（/check-stars 等）
- 13 个加权信号（README 列举，节选关键项）：账号质量/时序之外有跨平台对照（高 star 低 npm 下载 → 可疑）、打星重叠指纹（Jaccard 相似度，农场账号跨 campaign 复用）、地理聚集、已知农场黑名单、用户名香农熵
- 打分：贝叶斯式加权（每信号 0-1 子分 × 权重，缺数据信号权重自动重分配），权重表公开
- 已知瑕疵：README clone 指令写的仓库路径与实际仓库不一致（文档未同步）；「基于 CMU StarScout」的机构归属无独立来源可证
