# CORE-AGENT-DB: Core Platform MVP - Database Layer

## READ FIRST
1. Read `RALPH_PATTERNS.md` for conventions
2. Study existing `schema.ts` for exact patterns (lines 1-50 for imports/enums, any table for column patterns)
3. Study existing `storage.ts` for method patterns

---

## Mission
Add authentication and multi-tenancy foundation to the QMS Suite:
- 3 new tables: `organization`, `user`, `session`
- Add `orgId` foreign key to ALL existing tables (multi-tenancy)
- Storage methods for auth and tenancy
- Seed data with demo organization and users

---

## Phase 1: New Tables

### 1.1 Enums (add to schema.ts after existing enums ~line 25)

```typescript
// User role enum for RBAC
export const userRoleEnum = pgEnum('user_role', [
  'admin',           // Full organization access
  'quality_manager', // Approve documents, manage users
  'engineer',        // Create/edit documents
  'viewer'           // Read-only access
]);

// User status
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);
```

### 1.2 Organization Table

```typescript
export const organization = pgTable('organization', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // URL-safe identifier: "acme-corp"
  settings: jsonb('settings').$type<{
    defaultTimezone?: string;
    dateFormat?: string;
    logoUrl?: string;
  }>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('organization_slug_idx').on(table.slug),
}));
```

### 1.3 User Table

```typescript
export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(), // bcrypt hash
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  status: userStatusEnum('status').notNull().default('active'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgEmailIdx: uniqueIndex('user_org_email_idx').on(table.orgId, table.email),
  orgIdx: index('user_org_idx').on(table.orgId),
  emailIdx: index('user_email_idx').on(table.email),
}));
```

### 1.4 Session Table

```typescript
export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // Random 64-char token
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('session_token_idx').on(table.token),
  userIdx: index('session_user_idx').on(table.userId),
  expiresIdx: index('session_expires_idx').on(table.expiresAt),
}));
```

### 1.5 Relations

```typescript
export const organizationRelations = relations(organization, ({ many }) => ({
  users: many(user),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  organization: one(organization, {
    fields: [user.orgId],
    references: [organization.id],
  }),
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));
```

### 1.6 Zod Schemas & Types (add to bottom of schema.ts)

```typescript
export const insertOrganizationSchema = createInsertSchema(organization).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertUserSchema = createInsertSchema(user).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastLoginAt: true 
});
export const insertSessionSchema = createInsertSchema(session).omit({ 
  id: true, 
  createdAt: true 
});

export type Organization = typeof organization.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof user.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof session.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type UserRole = 'admin' | 'quality_manager' | 'engineer' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'pending';
```

---

## Phase 2: Add orgId to Existing Tables

### 2.1 Tables Requiring orgId

Add `orgId` column to ALL these existing tables:

```typescript
// Add this column to each table definition:
orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),

// Add this index to each table:
orgIdx: index('{table_name}_org_idx').on(table.orgId),
```

**Tables to modify:**

1. `processDef` - add orgId, add orgIdx
2. `part` - add orgId, add orgIdx  
3. `pfmea` - add orgId, add orgIdx
4. `controlPlan` - add orgId, add orgIdx
5. `equipmentLibrary` - add orgId, add orgIdx
6. `gageLibrary` - add orgId, add orgIdx
7. `failureModesLibrary` - add orgId, add orgIdx
8. `controlsLibrary` - add orgId, add orgIdx
9. `ratingScale` - add orgId, add orgIdx

**Note:** Child tables (processStep, fmeaTemplateRow, pfmeaRow, etc.) inherit orgId through their parent via foreign key. No need to add orgId to child tables.

### 2.2 Example: processDef modification

**Before:**
```typescript
export const processDef = pgTable('process_def', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // ... existing columns
}, (table) => ({
  nameRevIdx: uniqueIndex('process_def_name_rev_idx').on(table.name, table.rev),
  statusIdx: index('process_def_status_idx').on(table.status),
}));
```

**After:**
```typescript
export const processDef = pgTable('process_def', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // ... existing columns
}, (table) => ({
  nameRevIdx: uniqueIndex('process_def_name_rev_idx').on(table.orgId, table.name, table.rev), // UPDATED: include orgId
  statusIdx: index('process_def_status_idx').on(table.status),
  orgIdx: index('process_def_org_idx').on(table.orgId), // NEW
}));
```

### 2.3 Update Unique Constraints

Unique constraints should now include orgId (data is unique PER organization):

| Table | Constraint | Change to |
|-------|------------|-----------|
| `processDef` | `(name, rev)` | `(orgId, name, rev)` |
| `part` | `(partNumber)` | `(orgId, partNumber)` |
| `equipmentLibrary` | `(name)` | `(orgId, name)` |
| `gageLibrary` | none | add `(orgId, name)` |
| `failureModesLibrary` | none | add `(orgId, name)` |
| `controlsLibrary` | none | add `(orgId, name)` |
| `ratingScale` | `(version, kind)` | `(orgId, version, kind)` |

---

## Phase 3: Storage Methods

### 3.1 Add to IStorage interface

```typescript
// Organization
getOrganizationById(id: string): Promise<Organization | undefined>;
getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
createOrganization(data: InsertOrganization): Promise<Organization>;
updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined>;

// User
getUserById(id: string): Promise<User | undefined>;
getUserByEmail(orgId: string, email: string): Promise<User | undefined>;
getUsersByOrgId(orgId: string): Promise<User[]>;
createUser(data: InsertUser): Promise<User>;
updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
updateUserLastLogin(id: string): Promise<void>;

// Session
getSessionByToken(token: string): Promise<(Session & { user: User & { organization: Organization } }) | undefined>;
createSession(data: InsertSession): Promise<Session>;
deleteSession(token: string): Promise<void>;
deleteExpiredSessions(): Promise<number>;
deleteUserSessions(userId: string): Promise<void>;
```

### 3.2 Implementation

```typescript
// Add imports at top of storage.ts
import {
  organization,
  user,
  session,
  type Organization,
  type InsertOrganization,
  type User,
  type InsertUser,
  type Session,
  type InsertSession,
} from "@shared/schema";

// Organization methods
async getOrganizationById(id: string): Promise<Organization | undefined> {
  const [org] = await db.select().from(organization).where(eq(organization.id, id));
  return org;
}

async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
  const [org] = await db.select().from(organization).where(eq(organization.slug, slug));
  return org;
}

async createOrganization(data: InsertOrganization): Promise<Organization> {
  const [org] = await db.insert(organization).values(data).returning();
  return org;
}

async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined> {
  const [updated] = await db.update(organization)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organization.id, id))
    .returning();
  return updated;
}

// User methods
async getUserById(id: string): Promise<User | undefined> {
  const [u] = await db.select().from(user).where(eq(user.id, id));
  return u;
}

async getUserByEmail(orgId: string, email: string): Promise<User | undefined> {
  const [u] = await db.select().from(user)
    .where(and(eq(user.orgId, orgId), eq(user.email, email.toLowerCase())));
  return u;
}

async getUsersByOrgId(orgId: string): Promise<User[]> {
  return db.select().from(user).where(eq(user.orgId, orgId));
}

async createUser(data: InsertUser): Promise<User> {
  const [u] = await db.insert(user).values({
    ...data,
    email: data.email.toLowerCase(),
  }).returning();
  return u;
}

async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
  const updateData: any = { ...data, updatedAt: new Date() };
  if (data.email) updateData.email = data.email.toLowerCase();
  const [updated] = await db.update(user)
    .set(updateData)
    .where(eq(user.id, id))
    .returning();
  return updated;
}

async updateUserLastLogin(id: string): Promise<void> {
  await db.update(user)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(user.id, id));
}

// Session methods
async getSessionByToken(token: string): Promise<(Session & { user: User & { organization: Organization } }) | undefined> {
  const result = await db.query.session.findFirst({
    where: and(
      eq(session.token, token),
      sql`${session.expiresAt} > NOW()`
    ),
    with: {
      user: {
        with: {
          organization: true,
        },
      },
    },
  });
  return result as any;
}

async createSession(data: InsertSession): Promise<Session> {
  const [s] = await db.insert(session).values(data).returning();
  return s;
}

async deleteSession(token: string): Promise<void> {
  await db.delete(session).where(eq(session.token, token));
}

async deleteExpiredSessions(): Promise<number> {
  const result = await db.delete(session)
    .where(sql`${session.expiresAt} <= NOW()`)
    .returning();
  return result.length;
}

async deleteUserSessions(userId: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, userId));
}
```

### 3.3 Update Existing Methods for Tenancy

All existing storage methods that query "root" tables need an `orgId` parameter:

**Example - getAllParts becomes:**

```typescript
// Before
async getAllParts(): Promise<Part[]> {
  return db.select().from(part);
}

// After
async getAllParts(orgId: string): Promise<Part[]> {
  return db.select().from(part).where(eq(part.orgId, orgId));
}
```

**Methods requiring orgId parameter:**

| Method | Add Parameter |
|--------|---------------|
| `getAllParts` | `(orgId: string)` |
| `createPart` | ensure `orgId` in data |
| `getAllProcesses` | `(orgId: string)` |
| `createProcess` | ensure `orgId` in data |
| `getAllEquipment` | `(orgId: string)` |
| `createEquipment` | ensure `orgId` in data |
| `getAllFailureModes` | `(orgId: string)` |
| `createFailureMode` | ensure `orgId` in data |
| `getAllControls` | `(orgId: string)` |
| `createControl` | ensure `orgId` in data |

**Note:** Methods that get by ID (getPartById, etc.) don't need orgId - they're already scoped by the ID. The API layer will verify the record belongs to the user's org.

---

## Phase 4: Seed Data

### 4.1 Update seed.ts

Add at the BEGINNING of the seed function (before other seeds):

```typescript
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Helper to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Helper to generate slug from name
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create demo organization
  const [demoOrg] = await db.insert(organization).values({
    name: 'Acme Manufacturing',
    slug: 'acme-manufacturing',
    settings: {
      defaultTimezone: 'America/Detroit',
      dateFormat: 'MM/DD/YYYY',
    },
  }).returning();
  console.log(`✓ Created organization: ${demoOrg.name}`);

  // 2. Create demo users
  const adminPasswordHash = await hashPassword('admin123');
  const userPasswordHash = await hashPassword('user123');

  const [adminUser] = await db.insert(user).values({
    orgId: demoOrg.id,
    email: 'admin@acme.com',
    passwordHash: adminPasswordHash,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
  }).returning();
  console.log(`✓ Created admin user: ${adminUser.email}`);

  const [qmUser] = await db.insert(user).values({
    orgId: demoOrg.id,
    email: 'quality@acme.com',
    passwordHash: userPasswordHash,
    firstName: 'Quality',
    lastName: 'Manager',
    role: 'quality_manager',
    status: 'active',
  }).returning();
  console.log(`✓ Created quality manager: ${qmUser.email}`);

  const [engineerUser] = await db.insert(user).values({
    orgId: demoOrg.id,
    email: 'engineer@acme.com',
    passwordHash: userPasswordHash,
    firstName: 'Process',
    lastName: 'Engineer',
    role: 'engineer',
    status: 'active',
  }).returning();
  console.log(`✓ Created engineer: ${engineerUser.email}`);

  // 3. Update all existing seed data to use demoOrg.id
  // Pass demoOrg.id to all subsequent inserts...
  
  // ... rest of existing seed logic, but include orgId: demoOrg.id in all inserts
```

### 4.2 Update All Existing Inserts

Every existing insert in seed.ts needs `orgId: demoOrg.id` added.

**Example:**
```typescript
// Before
const [injectionMolding] = await db.insert(processDef).values({
  name: 'Injection Molding',
  rev: '2.1.0',
  status: 'effective',
  createdBy: seedUserId,
}).returning();

// After
const [injectionMolding] = await db.insert(processDef).values({
  orgId: demoOrg.id,  // ADD THIS
  name: 'Injection Molding',
  rev: '2.1.0',
  status: 'effective',
  createdBy: adminUser.id,  // Use real user ID
}).returning();
```

### 4.3 Add bcrypt Dependency

Ensure `bcrypt` is in dependencies:
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

---

## Validation Checklist

After completing CORE-AGENT-DB:

- [ ] `npx drizzle-kit push` succeeds
- [ ] Server starts without errors
- [ ] `npm run db:seed` creates org, users, and all existing data with orgId
- [ ] No TypeScript errors in schema.ts or storage.ts
- [ ] All new types are exported

---

## Files Modified

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add 3 tables, 2 enums, relations, Zod schemas, types. Add orgId to 9 existing tables. |
| `server/storage.ts` | Add ~15 new methods. Update ~10 existing methods with orgId parameter. |
| `server/seed.ts` | Create demo org/users first, add orgId to all existing inserts. |
| `package.json` | Add bcrypt dependency |

---

## Demo Credentials (for testing)

| Email | Password | Role |
|-------|----------|------|
| admin@acme.com | admin123 | admin |
| quality@acme.com | user123 | quality_manager |
| engineer@acme.com | user123 | engineer |
