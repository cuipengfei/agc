# Mutation testing、test oracle 与 invariant

> Sources: Thoughtworks Technology Radar, 2026-04-15; The Oracle Problem in Software Testing: A Survey, 2015; MDN Glossary: Invariant, Published date unknown; Efficient Mutation Testing by Checking Invariant Violations, 2009
> Raw: [Thoughtworks mutation testing](../../raw/software-testing/2026-09-09-thoughtworks-mutation-testing.md); [test oracle survey](../../raw/software-testing/2026-09-09-test-oracle-survey.md); [invariant definition](../../raw/software-testing/2026-09-09-invariant-definition.md); [mutation and invariant violations](../../raw/software-testing/2026-09-09-mutation-invariant-violations.md)
> Updated: 2026-09-09

Mutation testing evaluates a test suite by changing the program under test, running the tests against the changed versions, and recording whether the tests detect the changes. Test oracles determine whether observed behavior is acceptable. Invariants are properties that must remain true during relevant program execution; they can be used as one kind of oracle or as evidence that a mutant changed behavior.

## Mutation testing 的机制

Mutation testing 对程序应用 mutation operators，生成 mutants，然后运行既有测试套件。

- 测试失败，说明测试检测到了该 mutant。
- 测试继续通过，说明该 mutant 在当前测试套件下未被检测到。
- 未被检测到的 mutant 是测试验证范围中的缺口信号。

Mutation testing 的对象是 production code 的变异版本。它不要求把变异版本部署到生产运行环境。

## Test oracle 的作用

Test oracle 是判断测试执行结果是否正确或可接受的机制。它可以来自：

- specification；
- expected output；
- assertion；
- contract 或 postcondition；
- reference implementation；
- 不同执行之间必须成立的关系；
- invariant 或其他可检查性质。

没有 oracle，测试可以执行程序，但不能根据结果判断行为是否正确。

## Invariant 的位置

Invariant 是在相关程序执行过程中必须保持成立的性质。它描述的是“哪些条件不能被破坏”，而不是“所有值都不能改变”。

Invariant 与 mutation testing 的关系是：

```text
mutation          改变程序实现，生成 mutant
test oracle       判断执行结果是否可接受
invariant         可以作为 oracle 使用的一类性质
mutant detected   测试发现了 mutant 造成的可观察差异
```

因此，invariant 不是 mutation testing 的同义词。它是 mutation testing 可以使用的行为判据之一。

## Invariant violation 与 mutation analysis

研究工作将 invariant violation 用于 mutation analysis：如果某个 mutant 破坏了执行中观察到的 invariant，可以把该破坏作为 mutant 改变程序行为的证据。

这种方法还涉及两个独立问题：

- **Equivalent mutant**：代码发生变化，但相关语义没有变化，测试无法通过行为差异将其杀死。
- **执行成本**：mutant 数量增加时，需要重复运行测试，分析成本随之增加。

Invariant violation 可以帮助筛选影响观察性质的 mutants，但它不替代 mutation operators、test suite 或 test oracle。

## 结果如何解释

Mutation score 只能描述当前 mutation operators、测试输入、测试断言、执行范围和 mutant 分类规则下的检测结果。

它不能单独证明：

- 所有真实缺陷都能被发现；
- 测试覆盖了全部业务需求；
- 未被检测到的每个 mutant 都是测试缺陷；
- 被排除的每个 mutant 都是 equivalent mutant。

Mutation testing 的结果必须和 mutation model、test oracle、测试套件范围以及 equivalent mutant 处理方式一起解释。
