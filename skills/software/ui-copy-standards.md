---
name: ui-copy-standards
description: Voice, tone, and patterns for all user-facing text — button labels, error messages, empty states, tooltips, and microcopy.
domain: software
auto-load: false
used-by:
  - developer-agent
  - ui-ux-agent
  - qa-agent
---

# Skill: UI Copy Standards

> **Skill ID:** SW-022
> **Cluster:** Branding

## Purpose

Every word in a UI is a design decision. Bad copy — vague labels, robotic errors, inconsistent tone — erodes trust and creates confusion. Good copy is invisible: the user understands what to do without thinking about the words.

## Voice and Tone Framework

### Voice (Constant)

```markdown
Our voice is:
- **Clear** — No jargon, no ambiguity, no cleverness at the expense of clarity
- **Confident** — We know what we're doing and it shows in how we communicate
- **Helpful** — Every message moves the user forward, never leaves them stuck
- **[Brand-specific trait]** — [Derived from brand personality]
```

### Tone (Contextual)

| Context | Tone | Example |
|---|---|---|
| Onboarding | Encouraging, warm | "Let's set up your workspace — this takes about 2 minutes." |
| Success | Brief, positive | "Project created." |
| Error (user's fault) | Neutral, helpful | "That email's already in use. Try signing in instead." |
| Error (our fault) | Humble, reassuring | "Something went wrong on our end. We're looking into it." |
| Destructive action | Clear, serious | "This will permanently delete 23 files. This can't be undone." |
| Empty state | Encouraging, actionable | "No projects yet. Create your first one to get started." |
| Loading/waiting | Calm, informational | "Setting up your environment..." |
| Settings/admin | Neutral, precise | "Notifications are sent to your primary email address." |

## Copy Patterns

### Button Labels

```
Rule: Verb + Object. Tell the user what happens when they click.

Good: "Create project", "Save changes", "Send invitation", "Download report", "Remove member"
Bad: "Submit", "OK", "Click here", "Process", "Yes" / "No"
```

### Dialog Confirmations

```
Rule: Replace Yes/No with the actual actions.

Good: "Delete project" / "Keep project"
Good: "Discard changes" / "Continue editing"
Bad: "Yes" / "No", "OK" / "Cancel", "Confirm" / "Deny"
```

### Error Messages

```
Formula: What happened + What to do about it.

Good: "That email's already in use. Try signing in instead."
Good: "File too large. Maximum size is 10 MB."
Good: "Couldn't connect to the server. Check your internet and try again."
Bad: "Error 403", "An error has occurred", "Invalid input"
```

### Form Labels and Help Text

```
Rule: Labels state what. Help text states why or how.

Label: "Display name"  ->  Help: "This is how other team members will see you."
Label: "API key"       ->  Help: "Find this in your dashboard under Settings -> API."
Label: "Billing email" ->  Help: "Invoices and payment receipts will be sent here."
```

### Placeholder Text

```
Rule: Show format or example. Never repeat the label.

Label: "Email"        -> Placeholder: "you@company.com"
Label: "Phone"        -> Placeholder: "+1 (555) 000-0000"
Label: "Project name" -> Placeholder: "My awesome project"
```

### Toast / Notification Messages

```
Rule: Past tense for completed actions. Present tense for ongoing.

Good: "Project created", "Changes saved", "Invitation sent to 3 people", "Importing data..."
Bad: "Your project has been created successfully!", "Success!", "Done!"
```

### Empty States

```
Formula: What's missing + What to do about it

Good: "No team members yet. Invite your first team member to get started."
Good: "No results for 'xyz'. Try different keywords or clear your filters."
Bad: "Nothing to display", "0 results", "Empty"
```

## Capitalization Rules

```
UI Element          Capitalization     Example
Page titles         Title Case         "Project Settings"
Section headings    Sentence case      "Notification preferences"
Button labels       Sentence case      "Create project"
Menu items          Sentence case      "Account settings"
Tab labels          Sentence case      "Team members"
Table headers       Sentence case      "Last modified"
Tooltips            Sentence case      "Copy to clipboard"
Error messages      Sentence case      "That email is already in use."
Toast messages      Sentence case      "Changes saved"
```

**The rule: Sentence case everywhere except page titles.**

## Punctuation Rules

- Headings and labels: No period
- Single sentences in descriptions: No period
- Multiple sentences: Periods on all sentences
- Error messages: Period at the end
- Button labels: No period, no exclamation mark
- Tooltips: No period (if single sentence)
- Lists: No periods unless items are full sentences
- Never use exclamation marks unless genuinely exciting ("You earned a new badge!")

## Numbers and Formatting

- Use numerals in UI, not words: "3 projects" not "three projects"
- Use commas for thousands: "1,234" not "1234"
- Dates: "Apr 10, 2026" (abbreviated month, no leading zeros)
- Times: "2:30 PM" (12-hour with AM/PM for consumer apps)
- File sizes: "4.2 MB" (one decimal, uppercase units)
- Abbreviate large numbers: "12.5K" / "1.3M" for display, full number in tooltips
- Percentages: "85%" not "85 percent"
- Currency: "$10.00" with symbol prefix, two decimals

## Words to Avoid

| Avoid | Use Instead | Why |
|---|---|---|
| "Please" on every message | Use it sparingly for actual requests | Overuse sounds robotic |
| "Successfully" | Just state what happened | Redundant |
| "Invalid" | Explain what's wrong specifically | Unhelpful without context |
| "Error" as a standalone | State the actual problem | Users don't care that it's an "error" |
| "Are you sure?" | State what will happen | The user is sure — warn them what happens |
| "Oops!" / "Uh oh!" | Just state what went wrong | Infantilizing |
| "Hey there!" | [Nothing — skip the greeting] | Forced casualness |

## Consistency Checklist

- [ ] Same action uses same label everywhere (not "Save" here and "Update" there)
- [ ] Capitalization follows the defined rules consistently
- [ ] Error messages follow the "What happened + what to do" formula
- [ ] Button labels are Verb + Object, not vague
- [ ] Tone matches the context
- [ ] No jargon or technical terms exposed to non-technical users
- [ ] Numbers formatted consistently throughout
- [ ] Placeholder text shows format/example, never repeats the label
- [ ] Dialogs use action verbs instead of "Yes/No"
- [ ] No "successfully" anywhere
