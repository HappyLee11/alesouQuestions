# Progress Reporting Patterns

## Recommended one-message pattern

Use this pattern for most update requests:

- done:
- doing:
- next:
- blockers:

If `blockers` is empty, omit it.

## When the user asks for a strict cadence

Say the truth clearly:

- A skill or instruction can encode the preference.
- It cannot force timed wakeups if the runtime does not provide them.
- Continue reporting on milestone completion or when the user asks.

## Product-build updates

Include one of these labels where useful:

- scaffold
- demo-ready
- pre-commercial
- production-ready

## Keep the signal high

Prefer:
- concrete files changed
- concrete capabilities added
- the main remaining gap

Avoid:
- repetitive reassurance
- narrating obvious steps
- pretending background execution is guaranteed
