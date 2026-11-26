# 2026 年反汇编工具版本状态（Ghidra、IDA Pro、Binary Ninja）

> Source: web 检索快照（GitHub releases、Wikipedia、hex-rays.com、binary.ninja、nsa.gov、navy.mil），2026-11-26 与 2026-11-27 采集
> Collected: 2026-11-27
> Published: Unknown

检索日期 2026-11-26/27。发布日期归一化：Ghidra 12.2 → 2026-10-22；IDA 9.5 → 2026-10-26；Binary Ninja 6.0.10905 → 2026-10-20。起步与开源日期归一化：IDA 起步 → 1996；Ghidra 开源 → 2019-03-05；Binary Ninja 开发起步 → 2015、首发 → 2016-07-31。

## Ghidra

GitHub releases 页（https://github.com/NationalSecurityAgency/ghidra/releases）：

```
## Ghidra 12.2
[Ghidra 12.2](https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.2_build)
57 releases; Ghidra 12.2 Latest, last month Oct 22, 2026
```

Wikipedia（https://en.wikipedia.org/wiki/Ghidra）：

```
| Stable release | 12.2 / October 22, 2026; 32 days ago (2026-10-22) |
```

开源时间（navy.mil CHIPS，https://www.doncio.navy.mil/chips/ArticleDetails.aspx?ID=12247）：

```
FORT MEADE, Md., March 5, 2019 —NSA released Ghidra March 5 at the 2019 RSA Conference
```

nsa.gov（https://www.nsa.gov/Press-Room/News-Highlights/Article/Article/3319971/four-years-later-the-impacts-of-ghidras-public-release/）：

```
Four years ago at the 2019 RSA Conference, the National Security Agency (NSA) released Ghidra
```

## IDA Pro

hex-rays.com 官方博客（https://hex-rays.com/blog/ida-9-5-release）：

```
IDA 9.5 Is Here: More Platforms, More Agentic Power.
Oct 26, 2026 IDA. IDA 9.5 is here, and it's one of our biggest releases yet. Three new decompilers for Android Dalvik, Infineon TriCore, and ...
```

版本历史（licenseware 汇总，https://wiki.licenseware.io/products/hex-rays/ida-pro/）：

```
| 9.5 | 26 Oct 2026 |
| 9.4 | 13 Jul 2026 |
```

起步年份（Wikipedia，https://en.wikipedia.org/wiki/Interactive_Disassembler）：

```
## History
In 1996, the Belgian c…
Original author: Ilfak Guilfanov
```

## Binary Ninja

Wikipedia（https://en.wikipedia.org/wiki/Binary_Ninja）：

```
| Stable release | 6.0.10905 / October 20, 2026; 21 days ago (2026-10-20) |
| Release | July 31, 2016; 10 years ago (2016-07-31) |
## History
Development began in 2015, and the first public version was released in July 2016.
```

官方博客（https://binary.ninja/blog/）：

```
Binary Ninja 6.0 (Krypton) is here! This is a major version bump, and it's worth the wait. We've shipped a brand new MCP server, a new Binary ...
```

十周年页（https://binary.ninja/10years/）：

```
© 2015-2026 Vector 35
```

稳定分支 5.3 系列（https://binary.ninja/changelog/）：

```
5.3.9757 (2026-06-09) ... This is a bugfix and stability only R2 Release.
```

## 热度定性判断（非检索结果，采集者标注）

Ghidra 免费开源、社区与插件生态规模三者最大，是 agent 工具链零摩擦的默认选择；Binary Ninja 6.0 内置官方 MCP server，商业工具中对 agent 工作流最积极，话题度在商业圈最高；IDA 9.5 主打 agentic power（HCLI、IDA Pro AI），守住专业恶意软件分析市场。三者市场份额无权威统计，此段为定性判断。
