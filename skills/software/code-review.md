---
name: code-review
domain: software
auto-load: false
used-by:
  - qa-agent
  - security-agent
  - test-agent
description: >
  Five-lens structured review methodology (correctness, security, performance,
  maintainability, coverage). Fire when reviewing a diff, PR, or completed
  implementation before sign-off. Triggers: "review", "code review", "QA pass",
  "check this implementation".
---

# Skill: Code Review — Multi-Lens PR Review

> **Skill ID:** SW-014 · Quality gate — structured review methodology

## Purpose

Structured multi-lens code review methodology that gives QA Agent a repeatable framework for catching different categories of problems in a single pass. Each lens focuses on a different failure mode, preventing the common trap where a reviewer finds style issues but misses logic bugs.

## When to Load

- QA Agent is reviewing code for Standard or Deep tier tasks
- Security Agent is doing a focused security review (loads security lens only)
- Any code review involving changes to critical paths (auth, payments, data handling)

## When NOT to Load

- Quick-tier tasks (unless touching sensitive areas)
- Documentation-only changes
- Configuration changes with no code logic
- Non-software domains

---

## The Five Lenses

Review the diff through each lens sequentially. Each lens has a different question it's trying to answer. Resist the urge to mix concerns — finish one lens before moving to the next.

### Lens 1: Bug Hunter
**Question:** "Does this code do what it claims to do?"

Focus on logic errors, off-by-ones, race conditions, and incorrect assumptions.

**Check for:**
- **Boundary conditions** — What happens at 0, 1, empty, null, max? Does the code handle the edges?
- **Logic errors** — Are conditionals correct? Is `&&` vs `||` right? Are comparisons using the right operator (`===` vs `==`, `>` vs `>=`)?
- **State management** — Can state become inconsistent? Are there race conditions between async operations? Is state properly cleaned up on error paths?
- **Null/undefined handling** — What happens when an optional value is missing? Are there unguarded property accesses on potentially null objects?
- **Type coercion** — Are implicit type conversions happening that could produce unexpected results?
- **Loop behavior** — Can loops run forever? Are break/continue conditions correct? Are array indices correct?
- **Return values** — Are all paths returning the expected type? Are error cases returning the right status/value?
- **Side effects** — Does the function modify anything outside its scope unexpectedly? Are mutations intentional?

**Red flag patterns:**
```
// Off-by-one — should this be < or <=?
for (let i = 0; i < items.length; i++)

// Unguarded access — what if user is null?
const name = user.profile.displayName;

// Async gap — what if state changes between await calls?
const balance = await getBalance();
// ... something else happens here ...
await deductAmount(balance - cost);

// Implicit truthy check — 0 and "" are falsy but might be valid
if (value) { process(value); }
```

### Lens 2: Security Auditor
**Question:** "Can this code be exploited or does it leak sensitive data?"

Focus on injection, authentication, authorization, and data exposure.

**Check for:**
- **Input validation** — Is all user input validated and sanitized before use? Are there SQL injection, XSS, or command injection vectors?
- **Authentication gaps** — Are protected routes actually checking auth? Can auth be bypassed by manipulating request parameters?
- **Authorization failures** — Can User A access User B's data? Are object-level permission checks present, not just route-level?
- **Data exposure** — Are sensitive fields (passwords, tokens, PII) being logged, returned in API responses, or stored in browser storage?
- **Secret handling** — Are API keys, credentials, or tokens hardcoded? Are they in environment variables?
- **Dependency risk** — Are new dependencies from reputable sources? Do they have known vulnerabilities?
- **Error messages** — Do error responses leak internal details (stack traces, database structure, file paths)?
- **CSRF/CORS** — Are cross-origin protections configured correctly?
- **Rate limiting** — Are expensive or sensitive endpoints protected against abuse?

**Red flag patterns:**
```
// SQL injection — user input in query string
const query = `SELECT * FROM users WHERE id = ${userId}`;

// XSS — rendering user content without sanitization
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// Secret in code — should be environment variable
const API_KEY = 'sk-live-abc123...';

// Over-exposed data — returning full user object with password hash
res.json({ user: await User.findById(id) });

// Missing auth check — route handler doesn't verify session
app.get('/admin/users', async (req, res) => { ... });
```

### Lens 3: Code Quality
**Question:** "Will this code be maintainable in three months?"

Focus on readability, structure, patterns, and technical debt.

**Check for:**
- **Naming clarity** — Do variable and function names communicate intent? Would a new developer understand them without context?
- **Function size** — Are functions doing one thing? Can any function be broken into smaller, named pieces?
- **Duplication** — Is logic copied instead of abstracted? Are there near-identical blocks that should be a shared function?
- **Pattern consistency** — Does the new code follow existing project patterns? If it deviates, is the deviation justified?
- **Error handling** — Are errors caught and handled meaningfully? No empty catch blocks. No swallowing errors silently.
- **Comments** — Are non-obvious decisions explained? Are there comments that just restate the code?
- **Complexity** — Are there deeply nested conditionals that could be flattened? Is cyclomatic complexity reasonable?
- **Magic values** — Are there unexplained numbers or strings that should be named constants?
- **Dead code** — Are there commented-out blocks, unused imports, or unreachable branches?

**Severity guide:**
- Naming and comment issues → Advisory (won't block)
- Duplication of small blocks → Advisory
- Pattern violations → Major (should fix — inconsistency compounds)
- Missing error handling → Critical (must fix)
- Dead code → Minor (clean up, but won't block)

### Lens 4: Test Coverage
**Question:** "Is this code actually tested, and are the tests meaningful?"

Focus on what's tested, what's not, and whether the tests prove the code works.

**Check for:**
- **Happy path coverage** — Is the primary use case tested?
- **Error path coverage** — Are failure modes tested? What happens when inputs are invalid, services are down, or data is missing?
- **Edge cases** — Are boundary conditions tested (empty arrays, zero values, max lengths)?
- **Test quality** — Do tests assert on behavior, not implementation? Would the test break if the code was refactored without changing behavior?
- **Test isolation** — Do tests depend on each other's state? Can they run in any order?
- **Mock appropriateness** — Are mocks replacing the right things? Over-mocking tests nothing. Under-mocking tests the wrong things.
- **Missing tests** — What code paths have no test at all? Flag them explicitly.
- **Test naming** — Can you understand what the test proves from its name alone?

**Coverage thresholds (guidelines, not absolutes):**
- Critical paths (auth, payments, data mutations): 90%+
- Business logic: 80%+
- Utility functions: 70%+
- UI components: Focus on interaction tests, not snapshot coverage

### Lens 5: Historical Context
**Question:** "Does this change fit the project's trajectory and decisions?"

Focus on consistency with prior decisions, architectural alignment, and regression risk.

**Check for:**
- **DECISIONS.md alignment** — Does this change respect or contradict documented architectural decisions? If it diverges, is the divergence intentional and documented?
- **Regression risk** — What existing functionality could this change break? Are those areas covered by tests?
- **Migration path** — If this changes a shared interface, are all consumers updated? Are there backward compatibility concerns?
- **Technical debt** — Does this change introduce new debt? Does it resolve existing debt? Is new debt documented?
- **Scope creep** — Does the change include work beyond the task scope? If so, should it be a separate task?
- **Dependency impact** — Do new dependencies align with the project's tech stack decisions? Do they introduce conflicting versions or large bundle increases?

---

## Review Output Format

```
### Code Review — [Task ID]

**Lens 1 — Bug Hunter:** [# issues found]
- [Critical/Major/Minor] [file:line] Description of issue

**Lens 2 — Security Auditor:** [# issues found]
- [Critical/Major/Minor] [file:line] Description of issue

**Lens 3 — Code Quality:** [# issues found]
- [Critical/Major/Advisory] [file:line] Description of issue

**Lens 4 — Test Coverage:** [assessment]
- Coverage gaps: [list uncovered paths]
- Test quality concerns: [list]

**Lens 5 — Historical Context:** [alignment assessment]
- Decision conflicts: [list or "none"]
- Regression risks: [list or "low"]

**Verdict:** Approved | Conditional (fix critical/major, ship with minor) | Rejected (critical issues)

**Summary:** [1-2 sentence plain-language summary of the review]
```

---

## Calibrating Depth to Scope Tier

| Tier | Lens Depth |
|------|-----------|
| **Quick** | Skip this skill — QA Agent uses judgment without formal lenses |
| **Standard** | All 5 lenses, standard depth. ~15-20 minutes equivalent review effort. |
| **Deep** | All 5 lenses, exhaustive depth. Cross-reference DECISIONS.md and existing code patterns. ~30-45 minutes equivalent. |

---

## When to Escalate

The reviewing agent should escalate to PM or a specialist when:

- **Security lens finds a critical vulnerability** → Escalate to Security Agent if active, PM if not
- **Historical context lens finds a DECISIONS.md conflict** → Escalate to Architect
- **Bug hunter finds a design-level flaw** (not just implementation) → Escalate to Architect
- **Test coverage lens identifies systemic gaps** (not just this PR) → Escalate to PM for a dedicated testing task
- **Multiple major issues across lenses** → Reject with summary and escalate to PM for re-scoping
