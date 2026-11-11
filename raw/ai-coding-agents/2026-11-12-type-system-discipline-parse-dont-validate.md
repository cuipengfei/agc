# Type System Discipline 与 Parse, don’t validate 对照材料

> Source: https://github.com/cursor/plugins/blob/main/pstack/skills/principle-type-system-discipline/SKILL.md; https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/; https://lexi-lambda.github.io/
> Collected: 2026-11-12
> Published: Unknown

## 上游 Type System Discipline 原文

```markdown
---
name: principle-type-system-discipline
description: "Apply when designing types, reviewing a function signature, or writing code in any statically-typed language. Make illegal states unrepresentable, brand semantic primitives, parse external data at boundaries, exhaust variants, derive from authoritative schemas."
disable-model-invocation: true
---

# Type System Discipline

Make the compiler reject impossible states, mismatched primitives, and unhandled variants. Prefer defining errors and special cases out of existence over proliferating handlers. For TypeScript syntax, see the `typescript-best-practices` skill.

- **Brand semantic primitives.** `UserId` and `OrderId` are strings underneath but should not be interchangeable. Give each its own type, such as a branded intersection in TypeScript or a newtype elsewhere. Validate once at creation, trust the type downstream. If two arguments share a primitive type but mean different things, brand them.
- **External data is untyped until parsed.** RPC payloads, JSON, IPC messages, CLI args, config files, environment variables, database rows. Have a parse function at every boundary that turns unstructured input into the typed model. The **boundary-discipline** principle skill says where to put validation.
- **Derive types from authoritative schemas.** When a protocol buffer, OpenAPI spec, GraphQL schema, database migration, design-token file, or another file owns a shape, derive from it instead of hand-rolling a parallel type. See the **encode-lessons-in-structure** principle skill.
```

## Parse, don’t validate 文章信息

文章 URL：https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/

文章标题：`Parse, don’t validate`

页面显示日期：`2019-11-05`

站点首页标题：`Alexis King's Blog`

## 文章中的边界解析论述

The common theme between all these libraries is that they sit on the boundary between your Haskell application and the external world. That world doesn’t speak in terms of product and sum types, but in streams of bytes, so any parsing is necessarily a partial process. However, no matter what the boundary is, doing that parsing up front, before acting on the data, can go a long way toward avoiding many classes of bugs, some of which might even be security vulnerabilities.

## 文章中的实践建议

1. **Use a data structure that makes illegal states unrepresentable.** Model your data using the most precise data structure you reasonably can. If ruling out a particular possibility is too hard using the encoding you are currently using, consider alternate encodings that can express the property you care about more easily. Don’t be afraid to refactor.

2. **Push the burden of proof upward as far as possible, but no further.** Get your data into the most precise representation you need as quickly as you can. Ideally, this should happen at the boundary of your system, before *any* of the data is acted upon.[3](#footnote-3)

   If one particular code branch eventually requires a more precise representation of a piece of data, parse the data into the more precise representation as soon as the branch is selected. Use sum types judiciously to allow your datatypes to reflect and adapt to control flow.

文章结尾的回顾还写道：

None of the ideas in this blog post are new. In fact, the core idea—“write total functions”—is conceptually quite simple. Despite that, I find it remarkably challenging to communicate actionable, practicable details about the way I write Haskell code. It’s easy to spend lots of time talking about abstract concepts—many of which are quite valuable!—without communicating anything useful about *process*. My hope is that this is a small step in that direction.
