# truststar 摘录（truststar-app/truststar）

> Source: https://github.com/truststar-app/truststar README
> Collected: 2026-09-06
> Published: Unknown
> Type: excerpt（按 wiki 文章引用范围摘录）

- 形态：托管站点 + REST API + 可嵌入 README 徽章；可自托管（Next.js 15 + Vercel 模板）
- 三个引擎（README 列举）：Trust Score（4 维：账号质量/时序行为/项目健康/协同模式 → SAFE…DANGEROUS 标签）、npm Check（下载量 vs GitHub 信号交叉验证）、Code Scan（源码静态分析：硬编码 IP/可疑网络调用/混淆载荷——供应链安全向）
- 权重可经环境变量配置，不写死；算法引用 CopyCatch + He et al.
- 自报 benchmark：Trust Score 100%（29 repos）、Code Scan 94%（19 repos）——样本极小且自评，不作独立验证引用
