# EDN 格式规范与公开作者记录

> Source: https://github.com/edn-format/edn/blob/a51127aecd318096667ae0dafa25353ecb07c9c3/README.md; https://api.github.com/repos/edn-format/edn/commits?per_page=100; https://api.github.com/repos/edn-format/edn/contributors
> Collected: 2026-11-12
> Published: Unknown

## 规范标识与范围

仓库：`edn-format/edn`。

README 标题原文：

```text
edn
===
extensible data notation [eed-n]
```

规范按独立数据表示格式描述 EDN，供其他语言实现 reader 和 writer。规范说明它用于传递值，不是类型系统，也不自带 schema。README 的 Spec 一节说明当前规范仍采用非正式描述，后续可补充更严格的形式化定义。本材料只记录该公开规范，没有调查标准组织的全部标准目录。

## 规范内的语法片段

README 的 Built-in elements 包括 `nil`、booleans、strings、characters、symbols、keywords、integers、floating point numbers、lists、vectors、maps、sets。

vector 示例原文：

```edn
[a b 42]
```

map 示例原文：

```edn
{:a 1, "foo" :bar, [1 2 3] four}
```

内置 tagged elements 示例原文：

```edn
#inst "1985-04-12T23:20:50.52Z"
#uuid "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
```

`:` 开头的 keyword 可用作键或枚举值；map 的键可以是不同类型；逗号在字符串外按空白处理；`;` 引入行注释。EDN 数据应使用 UTF-8。上述规则是格式定义，不要求消费者通过执行 Clojure 程序读取数据。

## 初始提交 API 结果

请求：https://api.github.com/repos/edn-format/edn/commits?per_page=100

2026-11-12 返回 29 个提交，最早条目的字段为：

```json
{
  "author": "Rich Hickey",
  "date": "2012-09-06T16:09:47Z",
  "sha": "4d0fa9b2fc934e40d851b6e6cb239ec702950e83",
  "subject": "Initial commit"
}
```

日期：2012-09-06。

固定提交页面：https://github.com/edn-format/edn/commit/4d0fa9b2fc934e40d851b6e6cb239ec702950e83

## 贡献者 API 结果

请求：https://api.github.com/repos/edn-format/edn/contributors

```json
[
  {"contributions": 26, "login": "richhickey"},
  {"contributions": 1, "login": "honkfestival"},
  {"contributions": 1, "login": "davidrupp"},
  {"contributions": 1, "login": "ersiner"}
]
```

这些记录支持 Rich Hickey 创建并主导该公开规范仓库的表述。Uncle Bob 的工具采用 EDN 作为输出格式，与 EDN 规范的作者归属分开记录。本材料没有调查全部相关数据表示思想的最早历史。
