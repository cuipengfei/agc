---
Sources: OMP 源码 /home/cpf/code-inside/oh-my-pi, branch main, commit d49918fab2; 本会话 22 文件分类运行结果
Collected: 2026-09-21
Published: Unknown
---

# OMP Magic Keywords 与 jevify 源码摘录

## magic keyword 触发条件

OMP 的 magic keyword 匹配用户 prompt 中的独立小写单词。注册表后续重构为集中注册，但触发条件仍是 prompt 内精确单词匹配。

## jevify

`jevify` 会向会话追加隐藏 notice，提示 agent 在 eval kernel 中调用 `judge()`，先冻结 rubric，再批量分类，最后人工复核低置信度、错误或边界项。

配置开关：

- `magicKeywords.jevify` 默认开启
- 可用 `omp config set magicKeywords.jevify false` 关闭

## 本会话运行结果

对 AGC 提交 `923e731` 的 22 个文件执行 `jevify` 流程：

- 22/22 完成
- 用时 7.9 秒
- 分桶结果：wiki ingest 5、jev 研究 10、config-sync 5、mixed 2
- 通知中的实际模型为 `kimi-claw/k2d8-preview`

结论：`jevify` 指定工作流提示；它不指定固定判断模型。该次运行没有使用 JEV 模型。
