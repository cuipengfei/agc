# OMP eval judge() 的 Jev 题型、重复调用与语义检查实测

> Source: 本次 OMP 会话中的 eval 调用、工具输出与用户提供的服务端日志观察
> Collected: 2026-09-20
> Published: Unknown

本次调用与观察日期：2026-09-20。

## 范围

本记录保存以下会话证据：

- JavaScript 与 Python eval 均可调用 `judge(state, questions)`；
- `bool`、`choice`、`score` 三种 eval 题型的实际返回；
- 完全相同输入连续调用三次时的数值变化；
- 一次内容完整性判断中的高概率假阳性；
- 用户通过 API 服务端调用日志确认本次请求由 Jev 处理；
- 将 `judge(...)` 用于 skill 文本检查时得到的流程教训。

## JavaScript 与 Python 的 bool 调用

JavaScript 输入：

```javascript
const r = await judge("alpha", {
  same: {
    type: "bool",
    instructions: "输入是否恰好是 alpha？",
    criteria: {
      true: "恰好相同",
      false: "不相同"
    }
  }
}).wait();
```

JavaScript 输出：

```javascript
{ same: { type: 'bool', bool: 0.9 } }
```

Python 输入：

```python
r = judge('alpha', {
    'same': {
        'type': 'bool',
        'instructions': '输入是否恰好是 alpha？',
        'criteria': {
            'true': '恰好相同',
            'false': '不相同',
        },
    },
}).wait()
```

Python 输出：

```python
{'same': {'type': 'bool', 'bool': 0.88}}
```

## choice 与 score 的完整输入和输出

为消除“只展示 questions、没有展示 state”的疑问，会话中重新运行并在调用前打印两个参数。

完整输入：

```json
{
  "state": "这段说明清楚给出了一个明确结论和两条理由。",
  "questions": {
    "quality": {
      "type": "choice",
      "instructions": "判断这段说明的完整程度。",
      "criteria": {
        "complete": "有明确结论和理由",
        "partial": "只有结论或理由",
        "missing": "没有有效内容"
      }
    },
    "clarity": {
      "type": "score",
      "instructions": "评估表达清晰度。",
      "criteria": [
        "无法理解",
        "部分含糊",
        "基本清楚",
        "清楚且可以直接采用"
      ]
    }
  }
}
```

完整输出：

```json
{
  "quality": {
    "type": "choice",
    "choice": "complete",
    "confidence": 0.95,
    "probabilities": {
      "missing": 0.03,
      "partial": 0,
      "complete": 0.97
    }
  },
  "clarity": {
    "type": "score",
    "score": 2.74,
    "confidence": 0.74,
    "legend": {
      "0": "无法理解",
      "1": "部分含糊",
      "2": "基本清楚",
      "3": "清楚且可以直接采用"
    },
    "probabilities": {
      "0": 0.01,
      "1": 0.07,
      "2": 0.1,
      "3": 0.82
    }
  }
}
```

这段 state 只声称自己包含一个结论和两条理由，没有给出具体结论或具体理由。`quality` 仍以 0.97 的概率选择 `complete`。该结果证明这份 rubric 会接受自我声明，不能证明文本确实完整。

## 完全相同输入连续调用三次

同一个 JavaScript cell 使用与上一节完全相同的 state 和 questions，连续调用三次。输出如下：

```json
[
  {
    "quality": {
      "type": "choice",
      "choice": "complete",
      "confidence": 0.94,
      "probabilities": {
        "complete": 0.97,
        "partial": 0,
        "missing": 0.03
      }
    },
    "clarity": {
      "type": "score",
      "score": 2.79,
      "confidence": 0.79,
      "legend": {
        "0": "无法理解",
        "1": "部分含糊",
        "2": "基本清楚",
        "3": "清楚且可以直接采用"
      },
      "probabilities": {
        "0": 0.01,
        "1": 0.06,
        "2": 0.07,
        "3": 0.86
      }
    }
  },
  {
    "quality": {
      "type": "choice",
      "choice": "complete",
      "confidence": 0.93,
      "probabilities": {
        "complete": 0.96,
        "partial": 0,
        "missing": 0.04
      }
    },
    "clarity": {
      "type": "score",
      "score": 2.78,
      "confidence": 0.78,
      "legend": {
        "0": "无法理解",
        "1": "部分含糊",
        "2": "基本清楚",
        "3": "清楚且可以直接采用"
      },
      "probabilities": {
        "0": 0,
        "1": 0.06,
        "2": 0.08,
        "3": 0.86
      }
    }
  },
  {
    "quality": {
      "type": "choice",
      "choice": "complete",
      "confidence": 0.94,
      "probabilities": {
        "missing": 0.03,
        "complete": 0.96,
        "partial": 0.01
      }
    },
    "clarity": {
      "type": "score",
      "score": 2.81,
      "confidence": 0.81,
      "legend": {
        "0": "无法理解",
        "1": "部分含糊",
        "2": "基本清楚",
        "3": "清楚且可以直接采用"
      },
      "probabilities": {
        "0": 0.01,
        "1": 0.05,
        "2": 0.07,
        "3": 0.87
      }
    }
  }
]
```

三次 score confidence 为 0.79、0.78、0.81，可概括为约 0.8；这是同一输入重复调用所得范围。

三次 `quality.choice` 都是 `complete`。`complete` 概率为 0.96 至 0.97，`clarity.score` 为 2.78 至 2.81。分类保持一致，小数有轻微变化。

## 本次请求的实际后端

用户在会话中给出直接观察：

> it was jev, i know for sure, i saw the api server side call logs

因此，本记录中的上述调用可以确认由 Jev 处理。这个证据只覆盖本次调用。其他 `judge(...)` 请求仍需根据配置、服务端日志或其他运行证据确认实际后端。

## Skill 文本检查中的会话观察

本次会话用 `judge(...)` 检查 Uncharted skill 的语义行为。会话采用过两种粒度：

- 一个问题同时检查多项操作；
- 每项操作分别检查进入信号、操作、产物、通过条件。

聚合问题的结果曾出现波动，逐项问题能指出具体缺项。会话随后继续使用确定性检查确认字段是否存在，并使用 `judge(...)` 检查清晰度、自洽性、案例完整性和文风。

从本次过程得到的原始教训：

- 报告判定结果时，同时展示 state、questions 和 output；
- 只展示 questions 不能称为完整输入；
- rubric 要求引用具体内容时，不能接受文本对自身的声明；
- 多项目标分别提问，便于发现局部缺项；
- 修改前后需要复用同一 rubric，结果才有直接比较意义；
- 文件、JSON、字段、Markdown 和 Git 状态继续使用确定性检查；
- `judge(...)` 用于清晰度、完整性、自洽性、案例质量和文风等语义判断。
