# 本机 Mnemopi 配置与库统计

> Source: 本机 /home/cpf/.omp/agent/config.yml、/home/cpf/.omp/agent/memories/mnemopi/、命令输出
> Collected: 2026-10-27
> Published: Unknown

## 1. 配置片段

```yaml
modelRoles:
  memory: sensenova/glm-5.2:high
memory:
  backend: mnemopi
mnemopi:
  scoping: per-project-tagged
  embeddingVariant: multilingual
  embeddingApiUrl: http://localhost:4140/v1
  embeddingModel: text-embedding-3-small
  autoRecall: true
  autoRetain: true
  polyphonicRecall: true
  enhancedRecall: true
  proactiveLinking: true
  noEmbeddings: false
  llmMode: smol
  retainEveryNTurns: 4
  recallLimit: 8
  recallContextTurns: 3
  recallMaxQueryChars: 4000
  injectionTokenLimit: 5000
  debug: false
```

## 2. bank 文件尺寸

| bank 目录 | mnemopi.db 字节 | -wal 字节 |
|---|---:|---:|
| (root) | 1032192 | 107152 |
| acpx-omp-probe-33iryplkmu66r | 512000 | 0 |
| agc-djmfd5jv3zsd | 130908160 | 4190072 |
| buntoolbox-39k216yd8twpa | 3334144 | 0 |
| carly-17l227w9h82z9 | 4096 | 1722192 |
| copilot-api-3txf4siqne7xa | 27725824 | 0 |
| grok2api-26uu18j1za6er | 1843200 | 0 |
| kimi-claw-23bstcezeasr3 | 589824 | 0 |
| oh-my-pi-1izuqpu1lcwpb | 737280 | 0 |
| omp-judge-smoke-1vii2bcfe394k | 372736 | 0 |
| prompts-2t19xgpxgswjj | 14028800 | 0 |
| rigor-33jj1ni6rf6i5 | 1884160 | 0 |
| system-prompts-3p36hi955lqd7 | 372736 | 0 |
| tmp-1tpw73408x3e | 704512 | 0 |
| work-8s58n2avf4fv | 401408 | 0 |

## 3. 行数

| bank | working_memory | episodic_memory | facts |
|---|---:|---:|---:|
| (root) | 10 | 7 | 66 |
| acpx-omp-probe-33iryplkmu66r | 4 | 0 | 0 |
| agc-djmfd5jv3zsd | 1038 | 171 | 4085 |
| buntoolbox-39k216yd8twpa | 38 | 16 | 218 |
| carly-17l227w9h82z9 | 3 | 0 | 1 |
| copilot-api-3txf4siqne7xa | 239 | 42 | 1102 |
| grok2api-26uu18j1za6er | 12 | 1 | 46 |
| kimi-claw-23bstcezeasr3 | 3 | 0 | 6 |
| oh-my-pi-1izuqpu1lcwpb | 4 | 0 | 0 |
| omp-judge-smoke-1vii2bcfe394k | 0 | 0 | 0 |
| prompts-2t19xgpxgswjj | 101 | 21 | 284 |
| rigor-33jj1ni6rf6i5 | 19 | 0 | 72 |
| system-prompts-3p36hi955lqd7 | 0 | 0 | 0 |
| tmp-1tpw73408x3e | 7 | 3 | 0 |
| work-8s58n2avf4fv | 1 | 0 | 0 |
| 合计 | 1479 | 261 | 5880 |

## 4. 存在性检查

- OMP 版本：`@oh-my-pi/pi-coding-agent` 18.13.1。
- `ai-memory`：未安装（`command -v ai-memory` 无输出，退出码 1）；`/home/cpf/.local/share/ai-memory` 不存在。
- `sqlite3` CLI：不可用（`command -v sqlite3` 无输出，退出码 1）。
- 测量方法：`stat -c %s` 取文件字节数（未用 `du`）；计数由单个 bun 脚本以 `readonly: true` 打开每个 `mnemopi.db`，对 `working_memory`、`episodic_memory`、`facts` 执行 `SELECT COUNT(*)`，无任何写语句。
