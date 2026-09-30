# Managed Skills 创建门槛 raw 的采集日期勘误

> Source: 本会话操作记录
> Collected: 2026-10-01

## 勘误

`raw/omp-config/2026-09-30-managed-skills-createif-and-autolearn-prompt.md` 的 `Collected: 2026-09-30` 有误。

实际探针（Node `fs.readFileSync` 读取 `dist/cli.js`、按特征字符串定位 `class r9`/`class i9`/`vio`/`Pio` 等）与该 raw 的写入均发生在 **2026-10-01** 的会话中。文件名前缀与 `Collected` 字段沿用了前一日（2026-09-30 managed-skills 瘦身工作）的日期，属惯性笔误。

该 raw 已提交（commit `f60163b`），按仓库规则永久冻结，文件名与 `Collected` 字段保留原样；其探针内容本身无误，仅采集日期标注错误。本文件作为更正记录，与原 raw 并列引用。
