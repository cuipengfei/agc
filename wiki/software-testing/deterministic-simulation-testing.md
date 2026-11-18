# Deterministic Simulation Testing（确定性模拟测试）：单线程 Tick 驱动与故障重放

> Sources: Unmesh Joshi (martinfowler.com), 2026-11-17
> Raw: [Fowler deterministic simulation testing](../../raw/software-testing/2026-11-17-fowler-deterministic-simulation-testing.md)
> Updated: 2026-11-18

## Overview

分布式系统最难排查的一类缺陷，出现在部分故障与在线请求同时发生的时候。单元测试与集成测试都回答不了一个问题：系统的一部分出故障、同时还有请求正在处理时，客户端看到了什么。确定性模拟测试（DST）把时钟、网络、磁盘与线程调度全部换成模拟实现，让整个集群跑在单线程上，由测试显式调用 `tick()` 推进每一个组件。执行因此可以按种子原样重放，同时能把几个小时的真实超时压缩成几秒钟的循环迭代。文章用 Tickloom（作者为教学编写的 Java 库）和一个三节点 quorum KV 存储演示全部机制。

## 传统测试与混沌工程留下的空白

标准集成测试即使模拟故障，测的也是干净、可预期的场景，例如优雅关闭一个数据库节点。真实系统的故障形态远没有这么干净（见下节）。混沌工程（例如随机关掉 pod）回答的是可用性问题：写操作是否仍然成功、集群是否恢复。

可用性不等于正确性。文章的三节点示例里，节点叫 Athens、Byzantium 和 Cyrene，读写各需两个副本。网络分区把 Cyrene 隔离后，Alice 写入新值，Athens 与 Byzantium 构成多数派，写成功；Bob 随后从 Cyrene 本地读取，拿到旧值。每个请求都返回了响应，系统一直可用，客户端依赖的一致性保证却已经被破坏。Jepsen 的做法是记录客户端可见的操作历史，再交给一致性检查器判断是否与系统声称的语义相符：

```text
Alice: invoke set("title", "After Dawn")
Alice: ok     set("title", "After Dawn")
Bob:   invoke get("title")
Bob:   ok     get("title") -> "Before Dawn"   // violation: stale read after acknowledged write
```

## 灰色故障

生产环境的组件很少干脆地失败。多数时候它们只是行为失常。文章把这类现象称为 gray failure，并链接到微软研究院的论文，分别描述了四种形态：

- **节点**：不干脆断开，行为失常，引入不易察觉的异常。
- **网络**：不出现干净的两半分区，出现的是非对称路由、选择性丢掉一小部分报文，或者只延迟特定消息，延迟时间刚好让一台节点超时、另一台不超时。
- **进程**：不必然崩溃，可能出现 JVM 的 Stop-The-World GC 暂停或 CPU 被限流，暂停时间刚好让节点错过一次 consensus 心跳，几秒后醒来时完全不知道自己暂停过。
- **磁盘**：不整体损坏，出现局部延迟尖峰，同步 Write-Ahead Log 花 500ms 而非 2ms，或者悄悄损坏几个扇区。

这些降级条件下的事件交错，正是健壮系统被击穿的原因，标准测试无法按需构造。

## 不确定性从哪里来

在真实集群上，即使故障注入序列完全相同，执行仍然会走到不同路径。文章把原因分成两类：故障调度没有种子，以及执行本身不确定。前者可以用带种子的伪随机数生成器解决；后者来自软件之外的四个子系统，它们各自按自己的节奏推进，程序只能被动观察交错结果。

| 来源 | 为何每次不同 | 模拟中由谁决定 |
|---|---|---|
| 时钟与时间 | GC 暂停、繁忙核心、慢速网络跳点会让同一个操作这次 40ms、下次 120ms；NTP 还可能让墙钟跳变 | 测试推进到哪里，时钟就读到哪里 |
| 线程调度 | 操作系统按负载与核心数决定下一个运行的线程；跨进程时每个进程各跑各的速度，被 GC 暂停的进程会跟不上 | 整个集群单线程，测试按固定顺序执行每个进程 |
| 网络时序 | 缓冲、拥塞、重传与路由让到达时间变化，先发的消息后到；只注入同一个分区或丢包率解决不了 | 网络被 tick 时，测试决定每条消息何时投递 |
| 磁盘时序 | 写返回只代表进了操作系统页缓存；fsync 何时完成取决于设备、队列与其他 I/O | 磁盘被 tick 时，写才变成持久化 |

程序内部还有随机选择与数据结构遍历顺序两类来源，文章用编码规则处理，见后文。

文章用一个具体的 quorum 写场景说明后果：Cyrene 被隔离，协调者 Athens 需要自身写入加一个确认。Run 1 里 Byzantium 的确认按时到达，Alice 得到成功；Run 2 里同一个故障注入，确认在途中被延迟，Athens 超时返回失败。两种结果都不算错，但它们是同一个测试的两次不同执行，测试本身不决定会走哪条路径。如果缺陷只存在于 Run 2 的路径，重复运行可能每次都走到 Run 1。

## 让进度显式化

真实系统靠多个子系统各自前进：CPU 执行指令、网卡投递报文、磁盘完成刷盘。这些机制对测试隐藏且不可直接控制。确定性模拟测试把时钟、进程、网络、磁盘的进度全部收归测试控制：整个集群跑在单线程上，对着模拟时钟、模拟网络、模拟磁盘运行，没有任何东西自行推进。

强制故障（节点崩溃、网络分区）容易模拟；更有价值的是例行减速，延迟尖峰只是让完成时间晚几个 tick，灰色故障因此变得可以直接测试。

## Tickloom 实现骨架

Tickloom 的设计参考 FoundationDB 与 TigerBeetle。FoundationDB 用自制的 C++ 协程语言和确定性调度器开创了这套做法；TigerBeetle 的单线程 tick 驱动架构更容易用 Java 复刻。Tickloom 当前基于回调与自定义 future，基于 Java continuation 的确定性调度器写在后续工作里。

### 单线程与 `Tickable`

每个协议进程在测试和生产中都跑在单线程上。所有需要控制进度的组件实现同一个接口：

```java
public interface Tickable {
   void tick();
}
```

主循环按固定顺序对每个组件调用 `tick()`，组件不 tick 就不推进，两次 tick 之间状态不变。主线程绝不允许阻塞：

- 网络与存储调用全部异步。
- 异步 API 用自定义 future 组合，没有阻塞 `get()`，也不使用后台线程。
- 禁止 `Thread.sleep()` 与阻塞调用。
- 生产网络用非阻塞 Java NIO；必须放到后台线程的文件系统工作，把结果作为事件交回主线程，只在 tick 时处理。

### 网络与消息

协议代码不直接碰 socket，只通过 `Network` 接口收发 `Message`：

```java
public record Message(
       ProcessId source,
       ProcessId destination,
       PeerType peerType,
       MessageType messageType,
       byte[] payload,
       String correlationId
)
```

`send()` 把消息交给网络就立即返回；消息在若干 tick 后通过目标的 `onMessage()` 送达，回复也只是另一条消息。测试用 `SimulatedNetwork`（内存路由，支持分区、丢包、延迟），生产用 `NioNetwork`（真实 TCP，单个 `Selector`，非阻塞）。

`SimulatedNetwork` 维护进程对之间的 `NetworkLink`。`send()` 依次检查链接是否被分区、是否命中故障规则、是否按丢包率丢失；幸存的消息进入优先队列，带上投递 tick 与递增序号，保证同一 tick 内按发送顺序投递。`tick()` 递增内部计数器、应用动态故障变化、投递所有到期消息。

### 按 tick 计数的超时

`Timeout` 不读任何时钟，只数 tick，10 tick 的超时在第 10 次 `tick()` 后过期。`RequestWaitingList` 为每个在途请求登记一个 `Timeout`，每次 tick 推进所有超时并清理过期请求，以 `TimeoutException` 回调。侧栏指出 etcd-raft 也以 tick 计量选举与心跳超时（`ElectionTick`、`HeartbeatTick`），由 `Node.Tick()` 显式驱动，进程暂停多久都不影响超时判定。

### 测试写法

`Cluster` 构造进程、接上共享模拟网络，提供隔离节点、延迟链路等故障方法，以及 `tickUntil` 推进执行：

```java
cluster.isolateProcess(CYRENE);
cluster.setNetworkDelay(BYZANTIUM, ATHENS, 20);
TickCompletableFuture<SetResponse> write =
        alice.set("title".getBytes(), "After Dawn".getBytes());
cluster.tickUntil(() -> !write.isPending());
assertTrue(write.isFailed());
```

请求超时为 10 tick，Cyrene 被隔离，Byzantium 到 Athens 的确认延迟 20 tick。Athens 自己的写在几个 tick 内完成，确认赶不上超时，写失败，每次运行都失败。延迟改成 1 tick，每次运行都成功。

## 种子化故障注入与时间快进

手写场景适合教学。生产缺陷往往藏在长时间运行后才会出现的交错里，因此需要随机探索故障空间。

`SimulationRunner` 用带种子的 `Random` 初始化 `SimulationDecisions`，在每个 tick 做决定：是否发客户端请求（默认概率 0.4）、是否注入故障（0.08）、是否到自愈点（每 40 tick）。故障类型在隔离节点、分区一对节点、延迟一条有向链路、丢弃一条链路之间随机选择。同一个种子得到同一串故障，同一串故障得到同样的客户端可见结果；seed 42 出现的缺陷，用 seed 42 一定可以重放。

日志是设计的组成部分：把每个 tick 注入的故障（例如 `tick=12 isolate athens`、`tick=23 delay athens->byzantium by 5`）与进程、网络事件一起记录，很多违规只需阅读故障时间表与执行日志就能定位具体交错，不必进调试器。文章还提到，这种带 tick 时间戳的结构化日志很适合交给 LLM 分析。

**时间快进**来自 tick 与实际时间的固定比例：TigerBeetle 固定 `tick_ms = 10`；etcd 典型是 100ms 的 ticker 加 10 tick（一秒）的选举超时。活集群要等到一秒超时就得真等一秒，上千种故障组合很快累积成几天。模拟里 tick 只是驱动循环的一次迭代，协议照样等 100 tick，循环按 CPU 速度跑，原本要跑几小时的场景几秒结束。重放用来诊断已经找到的缺陷，快进用来找到缺陷。

## 正确性检查

运行结束后，录制客户端可见的操作历史（`invoke` 加上随后的 `ok`、`fail` 或超时），Jepsen 用 EDN 表示。文章用 seed 123 跑 500 tick，断言至少注入了一次故障，并且历史通过线性一致性检查：

```java
long seed = 123L;
long runForTicks = 500;
History history = runner.runAndGetHistory(runForTicks);
assertFalse(runner.faultSchedule().isEmpty(), "Expected at least one injected fault");
assertTrue(ConsistencyChecker.check(history, LINEARIZABILITY, REGISTER));
```

检查器报告违规时，种子就足以复现整条执行路径，开发者可以顺着确切的 tick 序列排查。

## 模拟文件系统与非阻塞 Future

存储层容易被突然崩溃打中，因为写完成只代表数据进了操作系统页缓存。`FileIO` 用异步接口隔离文件操作，`read`、`write`、`sync`、`size`、`truncate`、`close` 全部返回 future；写完成只说明字节对后续读可见，只有 `sync()` 完成才代表崩溃后数据仍在。

`SimulatedFile` 用两个字节数组表示这个区别：`visible` 包含尚未同步的写入，`durable` 保存已经同步的内容。读和写操作 `visible`，`sync()` 把 `visible` 复制到 `durable`，`crash()` 把 `visible` 重置为 `durable`，未同步的写入随之丢失。预写日志这类存储组件因此可以在崩溃与重启之间确定性测试。`SimulatedFileIO.tick()` 只执行本轮 tick 开始前入队的操作，回调里新提交的操作留到下一 tick。

标准 `CompletableFuture` 在单线程事件循环里有两个隐患：

- `get()`、`join()` 会卡住唯一的主线程，使 tick 循环永远无法完成该操作。
- `thenApplyAsync()` 把回调派发到后台线程池，重新引入线程调度带来的不确定性与副本状态上的竞争。

`TickCompletableFuture` 不暴露任何阻塞方法，没有后台 executor，并记录创建它的线程，从其他线程调用 `complete()`、`fail()`、`whenComplete()` 直接抛 `IllegalStateException`。

## 确定性的工程代价

文章明确说，DST 无法事后补上，需要前期架构投入。约束只作用在确定性的一侧：`Network`、`FileSystem`、`FileIO`、`Clock` 构成与操作系统之间的 seam；seam 背后的生产实现（`NioNetwork`、`SingleThreadedFileIO`、`SystemClock`）随便使用后台 I/O 线程、`ExecutorService`、NIO socket channel 与系统时钟，只要把结果交回单线程 tick 循环。

维持确定性要守六条编码规则：

1. 不调用系统时钟，时间只来自模拟 `Clock` 或 tick 计数。
2. 不使用未播种的随机数，随机决策与 ID 来自带种子的 `RandomGenerator` 或 `IdGen`。
3. 不直接使用 `Thread`、`Executor`、`CompletableFuture`。
4. 不直接做网络或磁盘 I/O，全部走 `Network` 与 `FileIO`。
5. 不遍历无序集合：`HashMap` 与 `Map.of()` 的按键查找是确定的，遍历 `HashMap`、`HashSet`、`ConcurrentHashMap` 的访问顺序可能每次不同（例如 `RequestWaitingList` 扫描过期请求时，先发出哪条超时消息会变）；核心状态改用 `LinkedHashMap`、`LinkedHashSet` 保证插入顺序。
6. 后台线程不跨 seam 直接调用确定性一侧的方法或完成 future；`IOThread` 只把完成事件排队，由主线程在 `tick()` 时处理。

一处 `HashMap` 遍历或一次 `System.currentTimeMillis()` 出现在消息 handler 里，就足以在将来某个罕见故障序列命中那段代码时悄悄破坏可重放性，靠代码评审守不住。文章用三层 fitness function 兜底：

- **ArchUnit 静态检查**：`DeterminismRulesTest` 每次构建运行，验证核心协议与存储包没有越过 seam，并且遵守前五条规则。
- **运行时线程约束检查**：静态字节码分析看不出 lambda 实际跑在哪个线程，第六条由 `TickCompletableFuture` 的 owner 线程检查在运行时守住。
- **整体 fitness function**：种子化 `FaultInjectingSimulationRunner` 加 `ConsistencyChecker`，在大量故障序列上验证线性一致性与崩溃后的持久性。

## 路线与适用边界

**消息级与字节级模拟。** Tickloom 与 TigerBeetle 在消息层模拟，TigerBeetle 的 `packet_simulator.zig` 按整条消息决定延迟、丢失、分区与拥塞，还能把同一条消息投递两次。FoundationDB 在字节流层模拟，`Sim2Conn`（`sim2.actor.cpp`）实现与真实 socket 相同的连接接口，允许部分写入、限制在途字节数、随机关闭连接，真实传输代码 `FlowTransport` 在其上完成分帧、缓冲与重连。消息级模拟覆盖协议依赖的丢包、延迟、分区、超时与重试，但永远不会执行把字节变成消息的代码；Tickloom 的 `NioConnection` 分帧逻辑只在真实网络上跑，跨两次读取才凑齐一帧、连接在帧中途断开这类缺陷在模拟里现不了。

**应用层与 hypervisor 层。** 文章走的是应用层路线，要求应用围绕相应抽象构建。另一条路线是把系统放进自定义确定性 hypervisor：拦截系统调用、虚拟化时间、控制线程调度让应用在单核上顺序执行，未修改的应用不论用什么语言都能确定性测试。从零构建 hypervisor 工程量巨大，商业平台 Antithesis 提供现成的确定性 hypervisor 与故障注入工具，适合无法重构应用的场景。

**生产性能。** 文章的经验判断是，多数分布式系统受 I/O 限制，单线程加异步批量 I/O 往往更好，省掉锁与线程上下文切换，Redis、FoundationDB、TigerBeetle 都是这个架构。代价是 tick 线程上的 handler 不能阻塞、不能做长时间 CPU 计算，否则消息处理会停住；单核只跑协议逻辑，多核扩展靠运行多个独立进程。作者认为前期投入换来了更容易推理的核心逻辑、更方便的随机故障探索，以及更安全的演进。

**教学与 LLM。** Tickloom 这类基础代码就位后，抽象层可以充当 harness，让 LLM 把书里的图表直接翻译成可执行场景测试。文章的例子是把《Designing Data-Intensive Applications》里的 quorum 线性一致性异常转成 `DDIA_LinearizabilityScenarioTest`。

## See Also

- [Mutation testing、test oracle 与 invariant](mutation-testing-oracles-and-invariants.md)
