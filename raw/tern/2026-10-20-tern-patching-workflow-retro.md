# Tern 补丁流程复盘与自动化要求

> Source: 当前会话用户要求与原始工具记录；现有 tern-maintain 源码及 CI
> Collected: 2026-10-21
> Published: 2026-10-20

## 用户提出的两个目的

用户原文：

> purpose 1: we should maximize amount of deterministic code work and minimize llm/agent inference work, during patching tern

> purpose 2: if we feed the wiki to another agent of another machine, it should be able to patch tern for the other machine as well

用户批准同时修改补丁工具与 wiki，并要求完成后 commit 和 push。

## 已确认的编辑边界

用户明确区分文本源码与二进制补丁。共享规则已据此调整：

- 文本源码编辑使用文件编辑工具，新建程序、脚本使用文件写入工具。
- 二进制补丁允许成熟库、脚本、构建工具提取、反汇编、变换、组装、编译、注入和验证。
- WAT 中间表示及补丁、测试模块、清单和验收报告允许程序化生成、拼接和改写。
- 执行这些操作的程序源码继续遵守文本源码编辑规则。

## 失败操作的原始摘录

### 候选与测试模块混用

会话 entry `b4b876a0` 的执行内容包含：

```python
src = '/tmp/tern-095-work/test-module.wasm'
cand = '/tmp/tern-095-work/candidate.wasm'
shutil.copyfile(src, cand)
```

实际工具输出中，candidate 与当时 profile 的 SHA-256 均为 `ce28ecb43c18861f96c63575f53d99998eaee81e9626b778ba7eae40c399cc0d`。这是一次过程中的错误操作；最终正式候选身份以独立升级证据为准。

### 报告没有经过真实 producer

会话 entry `e0150115` 把分析结果当作字体报告，并执行：

```python
f['sha256'] = f.get('sha256') or '0' * 64
f['bytes'] = f.get('bytes') or f['length']
f['expectedPointer'] = f['pointer']
f['expectedLength'] = f['length']
```

后续聚合曾同时传入旧版 runtime/service 报告，校验器实际拒绝：

> Invalid evidence: Runtime report version 0.9.4 does not match target 0.9.5

最终字体证据重新来自真实 FontTools producer，不能以这份手工填充的临时报告作为事实来源。

### 完整归档之前清理材料

会话 entry `47e8d4a9` 删除了临时 WAT 分片和测试模块，随后还删除整个临时工作目录。后续正式证据只能复用匹配 hash 的时间报告；补丁片段通过会话记录重新归档，归档创建时未完成重建比对。

## 有效的既有能力

实际已有的检查：官方资源 SRI、SHA-256、Ajv schema、候选与测试函数体来源、profile/glue 身份、FontTools cmap/字形数据、运行 binary 归属、资源与认证行为、pane 集合比较、token 脱敏。

已有 CI 运行 Bun 行为测试、FontTools 数据测试和同步项目 unittest。会话历史输出记录 Bun 41 pass / 0 fail、FontTools 2 项通过；本条是历史结果，后续实现的测试数量应以新输出为准。

## 源码中可定位的流程缺口

调查时 `analyze.mjs` 输出 `manual_review_required` 和 `manualEdits`；`cli.mjs` 没有构建命令。已审 WAT 片段保存在版本目录，但重建仍依赖手工组织。`verify-time.mjs` 已执行真实时间行为和来源检查，应复用。

`runtime.mjs` 的 browserCheck 主动用空白导航页面代替正式入口，再单独执行模块初始化和字体注入。该检查有隔离用途，但不能证明正式 index.html 的初始化代码实际执行。

## 自动化必须满足的要求

1. 已登记版本由固定原版 hash、工具版本和补丁 recipe 驱动。
2. 用成熟 compiler 解析、验证和编译 WAT；程序严格重放已经审核的修改。
3. 未知版本、匹配缺失、匹配歧义、ABI 不符立即停止，交给差异审核。
4. candidate 与测试模块分开生成，不覆盖原始输入，不修改 expected hash 迁就失败。
5. 从同一候选生成测试模块，执行既有真实时间验收。
6. 字体报告由真实 producer 生成，验证实际数据，禁止手工补齐结果。
7. 完整交付包保留原版、glue、recipe/片段、profile、候选、测试模块和真实报告。
8. 完整包验证成功后，才能清理可重新生成的大型中间 WAT。
9. 页面由单一模板装配，实际入口初始化需要独立执行检查。
10. 路径、端口、socket 和浏览器位置由参数给出，不依赖本机 HOME/PID/inode。
11. 支持平台、未验证部分、失败诊断和恢复步骤写进 wiki。
12. 使用不同工作目录与 HOME 重新构建，检查产物一致；不得据此宣称已验证所有 OS。
