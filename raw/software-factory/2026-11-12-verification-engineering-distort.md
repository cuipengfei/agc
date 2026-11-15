# Verification Engineering: How to Build AI Agents You Never Have to Check

> Source: https://x.com/distortgeekin/status/2120856919359258814
> Collected: 2026-11-15
> Published: 2026-11-12

Your agent said "done"

You opened it anyway, and you were right to: the button didn't work, one number came from nowhere, and the test it was proud of tested nothing

So now you check everything it does, which means the agent saved you nothing

That's the real ceiling on AI agents right now, not how much they can do, but how much of it you still have to read

SpaceXAI engineer Lauren Tan opened her talk on running agents with exactly that: "it all comes back to how much trust you have in your bot"

Boris Cherny, who created Claude Code, put the fix in one line: give the model a way to verify its work, and the quality of the result goes up 2-3x

That's verification engineering: build the checks once, so you stop being the check

Two days ago was the harness, everything around one agent, yesterday was the graph, how the work moves between agents, today is how you know the work is actually right

This is the whole idea in one place:

- why "done" from an agent means nothing on its own
- the 6 levels of done, and where most agents stop
- the 5 parts of a check you can trust
- why the agent that makes the work can never be the one that grades it
- one rule per mistake: how the checks write themselves over time
- a worked example, from 40 minutes of reading to 4
- how to tell which check you're missing

## The 30-second version

If you read nothing else, read this:

1. "Done" is a claim, a check is proof, never accept the claim without the proof
2. Write what "good" means before the work starts, as lines that pass or fail
3. The agent that made the work never grades it, a separate checker does, and its default answer is no
4. Check the result, not the reasoning: run it, open it, click it, recompute it
5. Every mistake you catch by hand becomes a written check, so you never catch it twice

## Why "done" means nothing

Agents grade themselves kindly

In their harness design post from March 2026, Anthropic wrote it plainly: ask an agent to evaluate work it produced and it tends to confidently praise it, even when a human can see the quality is mediocre

Their fix wasn't a better prompt for the maker, it was a separate evaluator tuned to be skeptical, which they found far easier than making a model critical of its own work

They check what they wrote, not what you wanted

An agent that writes the code and then writes the tests will test the code it wrote, so a wrong idea passes its own tests every time

They can game the check

Anthropic's system card for Claude 3.7 Sonnet described the model special-casing tests so they'd pass instead of fixing the real problem

Give an agent a check it can edit and sometimes it'll edit the check

None of this means agents are bad, it means "done" is a claim, and a claim needs proof

## The 6 levels of done

Every agent output sits on one of these levels, and you only get to stop reading at level 4

Level 0: it says so

"Done, everything works", no proof, this is where most agents stop

Level 1: it runs

The build passes, the script finishes, the file opens, cheap, and it only catches the dumbest failures

Level 2: it passes checks someone else wrote

Tests, a schema, a word count, a list of required sections, written before the work and never by the agent doing it

Level 3: someone tested the real result

A checker clicks through the live page, opens every link, recomputes every number from the source, sends the test email to itself

Anthropic's evaluator did exactly this, it drove the running app through Playwright the way a user would

Level 4: the proof is attached

Every "done" comes with what proves it: the screenshot, the test log, the link, the before and after, so you check the proof in seconds instead of redoing the work

Level 5: you only see what can't be undone

Everything reversible ships on the checks, and you approve only sends, payments, deletes and anything public

The jump from 0 to 3 changes your week, the jump from 3 to 4 changes your trust

## The 5 parts of a check you can trust

1. Criteria written before the work

Not "make it good", lines that pass or fail: "every number links to a source", "the form submits on mobile", "under 300 words"

If you can't write the criteria, the task isn't ready for an agent yet

2. A checker that isn't the maker

A separate agent with a separate context, it never sees how the work was made, only the work and the criteria

3. Ground truth, not reading

Anthropic's "Building effective agents" guide makes the same point: agents need ground truth from the environment at every step, the result of a tool call, the output of the code

Reading the code and saying it looks right is level 0 with extra steps, run it

4. A default answer of no

The checker passes the work only when every criterion passes, and sends it back with the exact lines that failed

5. Proof on every pass

A pass without proof is just another claim, so the checker attaches what it saw

## The maker never grades its own work

If I could keep only one rule from this whole piece, it would be this one

The maker knows why it made every choice, so every choice looks right to it

The checker only knows what you asked for and what it sees, so it finds the gap between them

Three things keep the checker honest:

- it never gets the maker's reasoning, only the result and the criteria
- it can't edit the work or the checks, it can only pass or send back
- it tests the live result, never the code that's supposed to produce it

And the loop between them has a limit: 3 rounds, then it stops and asks you

## One rule per mistake

Lauren Tan's way of running agents comes down to this: every mistake gets one written rule, once, and she never corrects it by hand again

That's how she showed her merged PRs going from 809 to 10,926 a month, the agents didn't get smarter, the checks got longer

The habit is simple:

1. You catch something by hand
2. You don't fix it in the chat, you write the check that would have caught it
3. It goes into CHECKS.md, and the checker runs every line on every task from then on

Week one you catch 10 things, week four you catch 1, because the other 9 are checks now

## A worked example: the weekly client report

Before

An agent writes a 4-page report every Friday from the sales sheet and the campaign dashboards

It always says "done", and I read all 4 pages anyway, about 40 minutes, because twice a number was wrong and once a link went to the wrong client

After

The agent writes → the checker runs CHECKS.md → anything that fails goes back with the failed lines, 3 rounds max → I read the verdict and approve the send

The checker recomputes every number from the sheet, opens every link, compares this week to last week and flags any change over 30%

What I read now is one line, "7 of 7 checks passed", plus the 2 flagged changes with their sources, about 4 minutes

The file: CHECKS.md

The checker reads this before every task, and the maker never sees how it's scored:

> TASK: weekly client report, sent Friday 10 AM
> PASS ONLY IF: every check below passes, otherwise send back with the failed lines
> 1. every number matches the sheet, recomputed, not copied
> 2. every link opens and belongs to this client
> 3. any change over 30% vs last week is flagged with its source
> 4. no client name except this one appears anywhere
> 5. under 600 words, the 3 required sections are present
> 6. every date is from this week, not last week
> 7. attach: the sheet range used, every link checked, the diff vs last week
> LIMIT: 3 rounds, then stop and ask me
> NEVER: nothing goes to the client before I approve

Checks 4 and 6 weren't there in week one, they're two mistakes I caught by hand, once

## Which check you're missing

When you still don't trust an agent, the symptom tells you which check isn't there:

- it says done and it isn't → no criteria written before the work
- the tests pass and the thing is broken → the maker wrote its own tests
- it looks right and the numbers are wrong → nobody recomputed from the source
- it works for the agent, not for you → the checker read the code instead of using the result
- the same mistake comes back every week → a fix in the chat, not a line in CHECKS.md
- you still read everything → the passes come with no proof attached

Six symptoms, six missing checks, and not one of them is fixed by a smarter model

## The mistakes that make verification useless

Asking the agent "are you sure?"

It's the same context that made the mistake, so it says yes, or apologizes and changes something that was right

Vague criteria

"Make sure it's high quality" passes everything

A checker that can edit

The moment it can fix things, it stops reporting them

Checking only at the end

A wrong plan checked after 2 hours of building wastes 2 hours, check the plan first

Letting the checker read the reasoning

A good story makes bad work look fine

Loops with no limit

3 rounds, then a human

Checking everything by hand forever

If you caught it twice, it's a check, not a habit

## Where to start tonight

1. Pick the one agent task you always re-check
2. Write down what you actually look for when you check it, that's your first CHECKS.md
3. Make a second agent the checker: criteria and the result only, default answer no, proof attached
4. Run it on the next task and read only the verdict and the proof
5. Every time you catch something it missed, add one line

Then notice how much of your week went into reading work that was already right

P.S: An agent you have to check isn't saving you time, it's just moving it

## If you read this far

→ Bookmark, repost or quote this, so the 6 levels, the CHECKS.md template and the "which check you're missing" list are right there the next time an agent tells you it's done

→ Join my Telegram channel

→ Follow @distortgeekin for a new AI agent breakdown every day
