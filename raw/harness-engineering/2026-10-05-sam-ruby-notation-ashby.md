# Sam Ruby：Pencils Down, Notation Up + Partly in the Right

> Source: https://intertwingly.net/blog/2026/09/25/Pencils-Down-Notation-Up.html ; https://intertwingly.net/blog/2026/09/27/Partly-in-the-Right.html
> Collected: 2026-10-05
> Published: 2026-09-25 ; 2026-09-27
> Author: Sam Ruby

## 获取方式

- `Pencils Down, Notation Up`：`read` 工具经 HTTP→HTTPS 跳转完整取回，无 elide 标记。
- `Partly in the Right`：`read` 工具完整取回，95 行，无 elide 标记。
- Chris Ford 转述 Ashby 定律的 LinkedIn 帖子：经 Sam Ruby `Partly in the Right` 引用，未独立获取；归因为 Sam Ruby 转述。

---

# Pencils Down, Notation Up

URL: https://intertwingly.net/blog/2026/09/25/Pencils-Down-Notation-Up.html
Published: 2026-09-25T17:53:48Z

I watched the opening keynote at [Rails World 2026](https://rubyonrails.org/world/2026/) expecting a talk on "Shaping the Future of Ruby on Rails." What I found instead was important and needed to be said, but it wasn't quite what that slot on the agenda had led me to expect.

The message I heard was that LLMs are a game changer (I agree), and that we are at an exciting point in history (again, agreed). The keynote [closed with](https://www.youtube.com/watch?v=vDjW_dRyKXY&t=3749s):
> So take the white pill, take the optimism pill, lean in. [...] realize there is only one choice, and that is for you to embrace the future with optimism, with gusto, with full acceleration. The black pill is for fucking losers. Don't be a loser.

There is only one choice, he said. I'd like to argue there's at least one more. I'd like to see a world where you can believe both the promises on the [Ruby on Rails website](https://rubyonrails.org/) and the vast majority of the premise of "Pencils Down." I think the gap between those two is much narrower than the keynote made it sound, and DHH himself described exactly where it is.

## The drill bit

Two days after the keynote, [DHH wrote](https://x.com/dhh/status/2103451962717229257):
> Rust is a good prompt compilation target for the moment, but so is C++. And soon assembler. Then microcode. Myopic to think we're going to stop the agentic drill bit until it reaches computing bedrock.

I agree with more of that than he might expect. There's a source, a translation step and a target, and the target will keep moving down. HEY's new backend is a good example of where that makes sense. It's a mail server, with an existing reference implementation to check against, and the hard parts are protocol edge cases and throughput. I can see the logic of Rust there.

The post leaves one question unasked, though: what sits at the *top* of the drill? What do we keep, edit and trust as the source of truth?

## A thought experiment

I have a concrete way to ask that question. Using [Roundhouse](https://github.com/rubys/roundhouse) and Matz's [Spinel](https://github.com/matz/spinel) compiler, I compiled Basecamp's own [ONCE Campfire](https://github.com/basecamp/once-campfire), unmodified, down to C. The drill has already reached that layer: the result is a single file of 202,000 lines, and it builds into a Docker image with no Ruby in it. [Download it](https://rubys.github.io/roundhouse/campfire/docker.tgz) and look for yourself; it's `pack/src/campfire.c`.

So here's the question. Give an agent a change to make to Campfire. Does it do better editing the Rails app or the C?

LLMs can probably handle both. The results won't be the same:

|                                | Campfire in Rails   | Campfire in C      |
| ------------------------------ | ------------------- | ------------------ |
| size                           | **~60k tokens**     | ~4M tokens         |
| fits in an agent's context?    | **yes, all of it**  | no, ~70× too large |
| lines mentioning `boosts`      | **20**, in 13 files | 1,220              |
| lines mentioning `involvement` | **28**, in 9 files  | 593                |

The sizes aren't quite like for like. The Rails column counts only Campfire's app code, while the C also contains the compiled framework. But an agent editing the C has to work inside all of it, and the framework never mentions `boosts`. Every one of those 1,220 lines comes from the app.

Nobody would choose to maintain the C. That's what makes it a compilation target. But it's worth being precise about *why*, because the same reasons apply to anything else we might put at the top of the drill.

## What a source of truth needs

**It has to fit in context.** Agents read far more than they write. Every change starts with loading the relevant code, and an agent makes mistakes about the code it didn't see. The Rails app fits in context whole; the C is only ever seen in slices.

**It has to say each thing once.** Changing how boosts work is about twenty coordinated edits in Rails and over a thousand in C. Each edit that's missed or slightly wrong is a bug, and in C it's often a memory-safety bug rather than an exception. The agent is also the future maintainer, so it's the one that pays for the mess.

**It has to keep the intent.** Those 1,220 lines of C exist because of `has_many :boosts` and a few declarations next to it. The C doesn't say so. The decision was erased when the code was compiled. Changing the decision in Rails is a one-line edit. Doing the same in the C means working backwards to the decision first, which is decompiling rather than maintenance.

**It has to produce the same result every time.** Compile the same Rails source twice and you get the same C. Regenerate from the same prompt twice and you get two different programs, each of which has to be verified again. The further down the drill goes, the less anyone can read the output, so verification carries more of the weight.

**It helps if the model has seen it before.** A conventional Rails app looks like thousands of others in the training data, so the agent's guesses are usually right. Generated C is a dialect the model has never seen.

None of these reasons depend on a human reading the code. The Rails homepage promises "token-efficient code that's easy for agents to write and beautiful for humans to review." With pencils down, the second half matters less. The first half matters more than ever.

## What about the prompt?

The obvious reply is that nobody maintains the C: you maintain the prompt and regenerate. That's the real disagreement, and it comes down to the same five tests.

For the output to be *the* Campfire rather than *a* Campfire, the prompt has to pin down every association, validation, callback and route. It has to say each of them once, compactly, in a form that produces the same result every time. A prompt that precise is a program. At that point you've written a domain-specific language for web applications with a database, and we already have one, refined over twenty years, that every model has read.

`has_many :comments` was always a specification. Rails is the notation; what runs it at the bottom is a separate question.

## You don't have to give up the numbers

The keynote's case for Rust was performance: 99% less CPU, 95% less memory. It's fair to ask whether keeping Rails at the top means giving that up.

It doesn't have to. Compiling a Rails reference app to Rust, I measure 85–140× Rails' throughput in 96% less memory. Compiling Campfire to a native binary, it's 7–8× the throughput of Campfire as its own Dockerfile deploys it, in 92% less memory, with 6–14× lower tail latency. ([Blog benchmarks](https://rubys.github.io/roundhouse/bench/), [Campfire benchmarks](https://rubys.github.io/roundhouse/bench/campfire/).) These are different apps from HEY, measured differently, so I'm not claiming a head-to-head. But they're the same order of magnitude, from unmodified Rails source.

The most telling number is a smaller one. The emitted code running on plain CRuby is already 6–10× faster than Rails. Most of the cost was never Ruby. It was deciding, on every request, what the app's declarations mean: `has_many :comments`, the routes, the callbacks, the views. Decide that once, at compile time, and most of the cost goes away.

## Pencils down, notation up

That's the talk I was hoping to hear in that slot. Not "Rails or agents," and not "Rails or Rust," but what Rails becomes when agents write the code: the most compact, precise and conventional specification of a web application, whatever it ends up compiled to.

Let the drill go as deep as it can. Just keep the notation at the top.

---

# Partly in the Right

URL: https://intertwingly.net/blog/2026/09/27/Partly-in-the-Right.html
Published: 2026-09-27T22:38:04Z

I'm speaking at [Deccan Queen on Rails](https://deccanqueenonrails.com/) in Pune, October 8–11. In [The Hidden 4GL](/blog/2026/09/03/The-Hidden-4GL.html) I described what I planned to bring, and two days ago, in [Pencils Down, Notation Up](/blog/2026/09/25/Pencils-Down-Notation-Up.html), I responded to the Rails World keynote. I'm still refining the talk, and still watching for signal. This post is what I've found worth examining since.

None of it settles anything. I've been reading other people's accounts of what agents can and can't do, and I've noticed something: they contradict each other, and I believe every one of them.

There's an old parable about this. Six blind men meet an elephant. One touches its side and says it is a wall; one touches the trunk and says it is a snake; one the tusk, a spear; one the leg, a tree. John Godfrey Saxe [put it into verse](https://en.wikisource.org/wiki/The_Poems_of_John_Godfrey_Saxe/The_Blind_Men_and_the_Elephant) in the nineteenth century, and ended it this way:
> Though each was partly in the right,
> And all were in the wrong!

I'm not writing this as the one who can see the elephant. I'm one of the six, and we are all exploring it together. What I can do is say what each of us seems to be touching. That turns out to be the interesting part.

## What each of us touched

**DHH touched ports.** HEY's mail server, rewritten in Rust with an agent, with an existing mail server to check against. This week 37signals [merged an assembler engine](https://github.com/omacom/ttfx/pull/35) for their terminal screensaver: 47,674 lines, 9.8× faster than the Rust it replaced. Its *Verification* section describes `oracle.sh`, which compares stdout, stderr and exit status against the Rust engine for all 37 effects, on every CPU tier. From where he stands, the drill goes all the way to bedrock.

**DHH also touched new features.** In the same keynote he [described Basecamp 5](https://www.youtube.com/watch?v=vDjW_dRyKXY&t=1354s), where designers vibe-coded the final features. "Individually, the designers were able to create PRs that seemed reasonable. Taken together, 20 or 30 of them, it left the architecture looking a little like a Swiss cheese, kind of punctured." The team concluded the technology wasn't ready, and he called that "the wrong conclusion, clearly": had they waited, "we would have gotten Fable, and the whole thing would probably have worked as originally intended."

**Jorge Manrubia touched a refactor.** In [Oh my Craft!](https://www.jorgemanrubia.com/2026/08/23/oh-my-craft/) he unified pagination and drag-and-drop across twelve years of Basecamp's JavaScript in a week. "Pre-AI, this would have been a multi-month effort." He verified it by clicking through dozens of screens, and then realized he could have done better "if I had asked it to take GIFs for the interactions and compare them." He still keeps one thing for himself: "High-level design: architecture, domain model and vocabulary, subsystems, dependencies, interfaces."

**Obie Fernandez touched greenfield.** In [You're Already a Meat Proxy](https://x.com/obie/status/2101779116056088732) he says he no longer reads every line, and he says why: "the systems I primarily work on are greenfield, well-designed, well-tested Ruby on Rails internal systems." He gets involved "when I want to add significant new functionality or make big architectural changes."

**Obie's friend touched something else.** A staff engineer on a monolith with hundreds of engineers, God objects, missing test coverage, and customer payments. Obie's demonstration on that code deleted dead code, opened a draft PR and filed five Jira epics in twenty minutes. Afterwards he wrote, to his credit: "We never got to the point of establishing that anything important had improved." Obie also quotes a post that went viral that week: "I have heard multiple times from higher management that pushing code is not a bottleneck, so why are we slow?"

**I touched a compiler with an oracle.** [Roundhouse](https://github.com/rubys/roundhouse) compiles Rails to ten targets, built by one person with agents this year. That sounds like evidence that agents can do anything. It isn't. Every target is held to real Rails: CI boots both and compares the DOM of every page, and Campfire's own test suite runs against the compiled binary. My work is a port too. I've said as much since June, when I bet that the scarce asset would be neither the framework nor the compiler but the oracle they are tested against, in [The Oracle Is the Asset](/blog/2026/06/12/The-Oracle-Is-the-Asset.html). The Hidden 4GL put it more bluntly: an agent will write you a code generator in an afternoon, and what doesn't get cheap is knowing whether it's right. I'm standing next to DHH at the trunk.

**James Martin touched it first.** In 1982 he published *Application Development Without Programmers*, and the fourth-generation languages spent fifteen years trying to make the title true. They worked beautifully for forms and reports, and generalized from there. Obie now expects AI to take everything "until the only humans left are the ones paying for whatever is being built." It's the same promise, forty-four years later, from a different part of the animal.

## What the elephant weighs

Chris Ford [supplied the constraint](https://www.linkedin.com/posts/ctford_ashbys-law-of-requisite-variety-sets-a-hard-share-7488171220773941248-D8tF/) that makes these accounts fit together:
> Ashby's Law of Requisite Variety sets a hard limit on what is possible with spec-driven development. Ashby showed that the controller must be as complex as the relevant distinctions in the state of the thing being controlled. [...] there is a lower bound on spec complexity that cannot be overcome by smarter models.

W. Ross Ashby stated it in his 1956 *An Introduction to Cybernetics*, as ["only variety can destroy variety."](https://en.wikipedia.org/wiki/Variety_(cybernetics)#Law_of_requisite_variety) In plain terms, whatever controls a system has to be able to tell apart at least as many situations as it needs to respond to differently. Ford's example is a thermostat. It doesn't need to model every possible temperature, but it does need to tell too hot, too cold and just right apart. In his framing the spec is the thermostat, and the generated code is the room.

Every result an agent produces has to get its information from somewhere. Ask where it came from in each of the cases above, and the contradictions go away.

|                                 | where the information came from      | what checked the result           |
| ------------------------------- | ------------------------------------ | --------------------------------- |
| a port                          | the existing system                  | the existing system, mechanically |
| a refactor                      | the existing app                     | a person clicking, or GIFs        |
| greenfield, well-tested         | conventions, plus the owner's intent | the tests                         |
| a new feature, one PR at a time | nobody in particular                 | each PR, on its own               |
| a mature system, no tests       | nobody                               | nobody                            |

"Port HEY to Rust" is five words, but it doesn't beat Ford's lower bound. It borrows. The existing mail server holds all the information, and the prompt only points at it. That's why the screensaver PR spends so much of itself on verification. The oracle *is* the specification.

A new feature has nothing to borrow from. Someone has to supply the distinctions: what it should do, what it must not break, what "done" means. At Basecamp 5 each PR was reviewed on its own, and the damage was between them. A reviewer who looks at one PR at a time can't see what happens across thirty. A better model doesn't change that; it produces more output that has to be checked.

I've been circling this for a while. In July, back from a retreat, I wrote that [rigor doesn't vanish when the agent writes the code, it migrates](/blog/2026/07/01/What-Survived-Contact.html): upstream into specifications, down into test suites, into types and constraints. In the same post I described two ways a test can get its expected answer. You can author the *then* by hand, and "for genuinely new behavior it's unavoidable, because the intent lives only in your head and someone has to put it somewhere." Or you can reference it from a running system, which is what Roundhouse does when it asks Rails for the answer to every request. Those are the feature and the port. What Ashby adds is *why* rigor migrates instead of vanishing: there's a lower bound, so it has to go somewhere.

This is also why I don't think either camp is simply right about "just trust the model." Obie can trust it because his tests and his conventions already hold most of the information. His friend can't, because nothing does.

## Where are you standing?

The practical question isn't whether agents are good. It's this: for the task in front of you this week, *where will the information come from, and what will check the result?*

If the answer is "an existing system," you are at the trunk with DHH. Build the oracle first, as 37signals did, and the drill will go as deep as you like.

If the answer is "me," you are at the other end of the elephant, and the size of what you have to say matters more than anything the model does. That was the point of Pencils Down, Notation Up: the notation at the top has to fit in context, say each thing once, and keep the intent. Ford's post makes the same point more precisely. You can shorten a spec by "eliding details we don't care about, or expressing our needs closer to the level of our intent," but not below the bound. Conventions are how you elide. `has_many :boosts` is how you state intent. And a compiler fills in what you elided the same way every time, where a prompt resamples it on every regeneration.

The Hidden 4GL asked the question every 4GL was an answer to: *how little must the human say?* Ford's answer is that it can't be less than the distinctions you care about. In a Rails app you can see where that floor is. The declarations, `has_many` and `validates`, are what conventions let you leave out. Every `def` is a place where the conventions ran out, because this application needed something no convention holds. The boundary between the generations that runs through every model is the same line as Ford's lower bound.

The best example I know of someone supplying that information deliberately is Jeremy Evans. After RubyConf he asked whether Roundhouse could do [Roda too](/blog/2026/07/20/Roda-on-Spinel.html), and reviewed the exemplar line by line before any compiler code existed. Then, when I asked whether a Rails-to-Roda converter was worth building, he [answered in three sentences](/blog/2026/07/22/Rails-on-Roda.html): a usefulness bar (a correct routing tree without duplicate branches), a failure policy (convert what converts, and leave the rest as a comment carrying the original code), and an acceptance test (ingest both applications and "check whether they result in the same IR"). All three came before the first line of the converter. That's the thermometer written before the thermostat, by the person the tool would serve, and nobody else could have written it for him. As I wrote then, every episode of this project that has gone well has had that shape.

## What none of us can see yet

These are the questions I'm carrying to Pune. I don't know the answers.

- **Can agents build the oracle when there isn't one?** Obie expects them to. Chad Fowler's [Regenerative Software](https://www.oreilly.com/library/view/regenerative-software/0642572383954/), now in early release, treats code as a derived artifact. Its chapter one lists what outlasts the code: behavior, boundaries, evaluations, evidence, provenance. Among its seven primitives are intent, compilation and "tests that outlive the code," and the chapter on the regeneration pipeline ends with "The Oracle Comes Next." He is touching the same part of the elephant I am. For an existing system that knowledge is in the system, waiting to be extracted. For a feature that doesn't exist yet, I don't see where it would come from.
- **How big is the remainder?** A model that has seen a thousand Rails apps fills in more of what you didn't say, and gets it right. That shrinks the gap for conventional code, but not for what is specific to your app. I haven't measured how big that part is. I think I know how to: Roundhouse's analyzer already separates declarations from method bodies, and its ledger marks where the Ruby takes over. How much of Campfire, Lobsters or Mastodon sits on each side of that line is a number worth publishing, and I'd rather publish it than guess.
- **What does a thermometer for a new feature look like?** Tests written first are one answer. Manrubia's GIFs are another. Neither is cheap, and I suspect this is where most of the craft is going.

If you've touched a part of the elephant I haven't, I'd like to hear about it, before Pune or while I'm there. Each of us is partly in the right. I'd rather we compared notes than disputed loud and long.
