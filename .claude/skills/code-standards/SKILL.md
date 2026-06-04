---
name: code-standards
description: |
  ALWAYS load when writing, editing, or reviewing code. Applies to all production code
  across all projects. Covers naming, error handling, patterns, and structure conventions.
  Do NOT load for documentation, research, or planning tasks.
---

# Code Standards — Universal

These standards apply to ALL production code in ALL projects using this framework.

## Rules
- Write clean, readable, well-structured code.
- Follow established project patterns — check existing code before creating new patterns.
- Meaningful variable and function names over comments explaining bad names.
- Error handling is not optional. Every external call, every user input, every file operation.
- No hardcoded values — use environment variables and configuration.
- Every function does one thing well.
- Inline comments explain WHY, not WHAT.

## Communication
- Code output: clean code with brief inline comments. No explaining every line unless teaching.
- Handoffs: Done/Open/Watch format. What was done, what's still open, what to watch for.
- Status updates: one line. "Task X complete. Passed to QA."

## Before Writing Code
1. Check `DECISIONS.md` for relevant architectural decisions.
2. Check existing codebase for established patterns — do not invent new patterns when one exists.
3. Confirm you have a clear task assignment with acceptance criteria.
