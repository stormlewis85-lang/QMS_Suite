---
name: input-validation
description: Input validation and sanitization patterns using Zod — form validation, API input validation, XSS prevention, SQL injection prevention, file upload security.
domain: software
auto-load: false
used-by:
  - developer-agent
  - security-agent
---

# Skill: Input Validation & Sanitization

> **Skill ID:** SW-026
> **Cluster:** Security

## Purpose

Every input from a user is a potential attack vector. Form fields, query parameters, headers, file uploads, JSON payloads — all of it. This skill codifies the validation and sanitization patterns that prevent injection attacks, data corruption, and unexpected behavior.

## Core Principle

**Validate everything. Trust nothing. Defense in depth.**

```
Client-side validation -> for UX (instant feedback)
Server-side validation -> for SECURITY (the real check)
Database constraints  -> for INTEGRITY (the last line)

Client-side validation alone is NOT security. It's UX.
Anyone can bypass it with a curl command.
```

## Zod Schema Patterns

### Basic Form Validation

```typescript
import { z } from "zod";

const signupSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .max(254, "Email is too long")
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name is too long")
    .trim(),
});

function validateSignup(input: unknown) {
  const result = signupSchema.safeParse(input);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }
  return { data: result.data };
}
```

### API Input Validation

```typescript
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createProjectSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const project = await createProject(result.data);
  return Response.json(project, { status: 201 });
}
```

### Common Validation Patterns

```typescript
// Slug
const slugSchema = z.string().min(1).max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase with hyphens only");

// UUID
const uuidSchema = z.string().uuid();

// Pagination
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Date range
const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine(data => data.from < data.to, "End date must be after start date");

// Enum
const statusSchema = z.enum(["active", "inactive", "archived"]);

// URL
const urlSchema = z.string().url().max(2048);

// Monetary amount (cents, avoid floating point)
const amountSchema = z.number().int().min(0).max(99999999);
```

## XSS Prevention

### Rule 1: Never Use `dangerouslySetInnerHTML`

```tsx
// NEVER unless rendering sanitized markdown/rich text
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// React auto-escapes by default
<div>{userContent}</div>
```

### Rule 2: Sanitize Rich Text

```typescript
import DOMPurify from "isomorphic-dompurify";

const sanitizedHtml = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li", "a", "code", "pre"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  ALLOW_DATA_ATTR: false,
});
```

### Rule 3: URL Validation

```typescript
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Validate redirect targets
const next = req.query.next as string;
if (next && isSafeUrl(next) && new URL(next).origin === process.env.APP_URL) {
  res.redirect(next);
} else {
  res.redirect("/");
}
```

## SQL Injection Prevention

```typescript
// NEVER concatenate user input into queries
const query = `SELECT * FROM users WHERE email = '${email}'`; // BAD

// ALWAYS use parameterized queries
const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);

// ORMs handle this automatically
const user = await prisma.user.findUnique({ where: { email } });
```

## File Upload Security

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= MAX_FILE_SIZE, "File too large. Maximum 10MB.")
    .refine(f => ALLOWED_TYPES.includes(f.type), "File type not allowed."),
});

// Additional server-side checks:
// [] Validate MIME type by reading file magic bytes (don't trust Content-Type)
// [] Generate a new filename (never use the user's filename)
// [] Store outside the web root
// [] Scan for malware if handling untrusted uploads
// [] Set Content-Disposition: attachment on download
```

## Validation Checklist

```
Every form:
[] Client-side validation for immediate feedback (Zod + react-hook-form)
[] Server-side validation as the security check (same Zod schema reused)
[] Database constraints as the last line (NOT NULL, CHECK, UNIQUE)
[] Error messages are user-friendly, not exposing internals

Every API endpoint:
[] Request body validated with Zod schema
[] Query parameters validated and typed
[] Path parameters validated (UUID format, slug format, etc.)
[] Reject unexpected fields (Zod .strict() or .strip())
[] Rate limited appropriately

Every user-provided string:
[] Trimmed of whitespace
[] Maximum length enforced
[] Rendered safely (React auto-escaping or DOMPurify)
[] Not interpolated into SQL, HTML, or shell commands

Every file upload:
[] Size limit enforced
[] Type validated by magic bytes, not just extension
[] Filename regenerated
[] Stored safely
```
