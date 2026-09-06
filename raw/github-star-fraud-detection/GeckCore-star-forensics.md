# star-forensics 摘录（GeckCore/star-forensics）

> Source: https://github.com/GeckCore/star-forensics README
> Collected: 2026-09-06
> Published: Unknown
> Type: excerpt（按 wiki 文章引用范围摘录）

- 形态：CLI，`pip install` 后 `star-forensics analyze owner/repo`；可导出 HTML/JSON
- 8 个检测器（README 列举）：幽灵账号（0 repo/0 follower/无 bio）、建号日期聚集、star 速率突刺、新号即打星（30 天内）、社交孤立、bot 式用户名、零仓库打星者、星/叉比失调
- 输出：Trust Score 0-100 + 等级（A 80+ → F 0-34）+ 置信度 + 每检测器证据行
- 自我声明：分数是信号不是判决；README 给出误报场景（HN 首页病毒传播会像购买突刺）；权重待校准（help us calibrate them）
