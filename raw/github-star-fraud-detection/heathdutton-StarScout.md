# StarScout 论文复现包摘录（heathdutton/StarScout）

> Source: https://github.com/heathdutton/StarScout README
> Collected: 2026-09-06
> Published: Unknown
> Type: excerpt（调研会话按需摘录，非完整 README）

- 定位：ICSE 2026 论文（arXiv:2412.13459）官方复现包；作者 Bogdan Vasilescu、Christian Kästner
- 两类核心启发式：low-activity（打星账号零活动）+ lockstep（CopyCatch 式协同打星，按半年分块）
- 运行成本（README 自述）：low-activity 需 BigQuery ≥20TB（约 $125+）；lockstep ≥40TB 且跑一周；另需 MongoDB + GCP 配置
- 标注数据集发布在 Zenodo
- 全平台分析发现约 600 万疑似假 star（论文结论，README 引述）
- 伦理立场：数据集只标「疑似」，反对用结果公开点名具体仓库
