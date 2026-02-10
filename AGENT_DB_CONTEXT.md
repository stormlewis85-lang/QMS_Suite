# AGENT-DB CONTEXT: Document Control Module
## Schema, Storage, and Seed Data (REFINED v2)

---

## YOUR ROLE
You are AGENT-DB. Your job is to add Document Control tables, storage methods, and seed data to the existing PFMEA Suite codebase.

## CRITICAL RULES
1. **APPEND ONLY** — Add new code at the end of each relevant section. Never reorganize existing code.
2. **ONLY MODIFY** these files:
   - `shared/schema.ts` — Add tables, enums, relations, Zod schemas
   - `server/storage.ts` — Add methods to IStorage interface AND DatabaseStorage class
   - `server/seed.ts` — Add Document Control seed data section
3. **DO NOT TOUCH** any other files (routes.ts, client/, tests/, etc.)
4. Output **complete implementations**, not snippets.

## TECH STACK
- Drizzle ORM with PostgreSQL (Neon)
- Zod for validation schemas via `createInsertSchema` from 'drizzle-zod'
- UUID primary keys (defaultRandom)
- Timestamps with defaultNow()

---

## EXISTING FILE STRUCTURE — WHERE TO ADD CODE

### schema.ts Structure (615 lines currently)
```
Lines 1-25:    Imports and existing enums
Lines 26-200:  Process Library tables (processDef, processStep, fmeaTemplateRow, etc.)
Lines 200-400: Library tables (equipmentLibrary, failureModesLibrary, controlsLibrary, etc.)
Lines 400-540: Relations definitions
Lines 541-564: Insert schemas (Zod)
Lines 565-615: Type exports
```

**ADD YOUR CODE:**
- New enums: After line 25 (after existing enums, before first table)
- New tables: After line 400 (before relations section)  
- New relations: After existing relations (before insert schemas)
- New insert schemas: After line 564 (before type exports)
- New types: At end of file after line 615

### storage.ts Structure (539 lines currently)
```
Lines 1-50:    Imports
Lines 51-140:  IStorage interface methods
Lines 141-539: DatabaseStorage class implementation
```

**ADD YOUR CODE:**
- New interface methods: Add at end of IStorage interface (before closing brace)
- New implementations: Add at end of DatabaseStorage class (before closing brace)
- New imports: Add to existing import statement at top (line 2)

### seed.ts Structure (2572 lines currently)
```
Lines 1-5:     Imports  
Lines 6-2500:  Controls catalog and existing seed data
Lines 2500+:   seed() function
```

**ADD YOUR CODE:**
- Add new imports at top (line 2)
- Add new seed section inside the seed() function, at the end before `console.log('Seed complete')`

---

## EXISTING PATTERNS TO FOLLOW EXACTLY

### Schema Pattern (match exactly)
```typescript
// Enum (add after line 25)
export const documentTypeEnum = pgEnum('document_type', [
  'procedure', 'work_instruction', 'form', 'specification', 
  'standard', 'drawing', 'customer_spec', 'external', 'policy', 'record'
]);

// Table (add after line 400)
export const document = pgTable('document', {
  id: uuid('id').primaryKey().defaultRandom(),
  docNumber: text('doc_number').notNull().unique(),
  title: text('title').notNull(),
  type: documentTypeEnum('type').notNull(),
  // ... more fields
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  docNumberIdx: uniqueIndex('document_doc_number_idx').on(table.docNumber),
  statusIdx: index('document_status_idx').on(table.status),
}));

// Relations (add before insert schemas)
export const documentRelations = relations(document, ({ many }) => ({
  revisions: many(documentRevision),
  distributions: many(documentDistribution),
  reviews: many(documentReview),
  links: many(documentLink),
}));

// Insert schema (add after line 564)
export const insertDocumentSchema = createInsertSchema(document).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Types (add at end)
export type Document = typeof document.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
```

### Storage Interface Pattern (match exactly)
```typescript
// In IStorage interface
getDocuments(filters?: { type?: string; status?: string; category?: string; search?: string }): Promise<Document[]>;
getDocumentById(id: string): Promise<Document | undefined>;
createDocument(data: InsertDocument): Promise<Document>;
updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined>;
deleteDocument(id: string): Promise<boolean>;
```

### Storage Implementation Pattern (match exactly)
```typescript
// In DatabaseStorage class
async getDocuments(filters?: { type?: string; status?: string; category?: string; search?: string }): Promise<Document[]> {
  let conditions = [];
  
  if (filters?.type) {
    conditions.push(eq(document.type, filters.type as any));
  }
  if (filters?.status) {
    conditions.push(eq(document.status, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        ilike(document.title, `%${filters.search}%`),
        ilike(document.docNumber, `%${filters.search}%`)
      )
    );
  }
  
  if (conditions.length > 0) {
    return await db.select().from(document).where(and(...conditions)).orderBy(document.docNumber);
  }
  return await db.select().from(document).orderBy(document.docNumber);
}

async createDocument(data: InsertDocument): Promise<Document> {
  const [result] = await db.insert(document).values(data).returning();
  return result;
}

async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined> {
  const [result] = await db.update(document)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(document.id, id))
    .returning();
  return result;
}

async deleteDocument(id: string): Promise<boolean> {
  const result = await db.delete(document).where(eq(document.id, id));
  return result.rowCount > 0;
}
```

---

## WHAT TO BUILD

### 1. New Enums (add after line 25)
```typescript
export const documentTypeEnum = pgEnum('document_type', [
  'procedure', 'work_instruction', 'form', 'specification', 
  'standard', 'drawing', 'customer_spec', 'external', 'policy', 'record'
]);

export const documentReviewStatusEnum = pgEnum('document_review_status', [
  'pending', 'approved', 'rejected', 'deferred'
]);
```

### 2. New Tables (5 total)

**document** — Master record for each controlled document
- id (UUID PK)
- docNumber (TEXT UNIQUE NOT NULL) — e.g., "WI-MOL-001"
- title (TEXT NOT NULL)
- type (document_type_enum NOT NULL)
- category (TEXT) — e.g., "Molding", "Quality", "Engineering"
- department (TEXT)
- currentRev (TEXT NOT NULL DEFAULT 'A') — e.g., "A", "B", "C"
- status (status_enum NOT NULL DEFAULT 'draft') — REUSE existing statusEnum
- owner (TEXT NOT NULL) — responsible person name
- effectiveDate (TIMESTAMP)
- reviewDueDate (TIMESTAMP) — next periodic review
- reviewCycleDays (INTEGER DEFAULT 365)
- retentionYears (INTEGER DEFAULT 7)
- description (TEXT)
- externalRef (TEXT) — URL to external file
- isExternal (BOOLEAN DEFAULT false)
- tags (JSONB DEFAULT [])
- createdAt (TIMESTAMP DEFAULT now())
- updatedAt (TIMESTAMP DEFAULT now())

**document_revision** — Version history for each document
- id (UUID PK)
- documentId (UUID FK → document, onDelete cascade)
- rev (TEXT NOT NULL) — "A", "B", "C"
- changeDescription (TEXT NOT NULL)
- status (status_enum NOT NULL DEFAULT 'draft') — REUSE existing statusEnum
- author (TEXT NOT NULL)
- reviewedBy (TEXT)
- approvedBy (TEXT)
- approvedAt (TIMESTAMP)
- effectiveDate (TIMESTAMP)
- supersededDate (TIMESTAMP)
- contentHash (TEXT)
- attachmentUrl (TEXT)
- createdAt (TIMESTAMP DEFAULT now())

**document_distribution** — Track who received which version
- id (UUID PK)
- documentId (UUID FK → document, onDelete cascade)
- revisionId (UUID FK → document_revision, onDelete cascade)
- recipientName (TEXT NOT NULL)
- recipientRole (TEXT)
- distributedAt (TIMESTAMP DEFAULT now())
- acknowledgedAt (TIMESTAMP)
- method (TEXT DEFAULT 'electronic')
- copyNumber (INTEGER)

**document_review** — Periodic review tracking
- id (UUID PK)
- documentId (UUID FK → document, onDelete cascade)
- revisionId (UUID FK → document_revision, onDelete set null)
- reviewerName (TEXT NOT NULL)
- reviewerRole (TEXT)
- status (document_review_status_enum NOT NULL DEFAULT 'pending')
- comments (TEXT)
- reviewedAt (TIMESTAMP)
- dueDate (TIMESTAMP)
- createdAt (TIMESTAMP DEFAULT now())

**document_link** — Cross-references to other entities
- id (UUID PK)
- sourceDocId (UUID FK → document, onDelete cascade)
- targetType (TEXT NOT NULL) — 'pfmea', 'control_plan', 'process', 'part', 'document'
- targetId (UUID NOT NULL)
- linkType (TEXT NOT NULL) — 'references', 'supersedes', 'supports', 'derives_from'
- createdAt (TIMESTAMP DEFAULT now())

### 3. Relations (add after existing relations, before insert schemas)
- document has many revisions, distributions, reviews, links
- documentRevision belongs to document
- documentDistribution belongs to document and documentRevision
- documentReview belongs to document and documentRevision
- documentLink belongs to document

### 4. Storage Methods Required

```typescript
// === DOCUMENT CONTROL STORAGE METHODS ===

// Documents
getDocuments(filters?: { type?: string; status?: string; category?: string; search?: string }): Promise<Document[]>;
getDocumentById(id: string): Promise<Document | undefined>;
getDocumentByNumber(docNumber: string): Promise<Document | undefined>;
createDocument(data: InsertDocument): Promise<Document>;
updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined>;
deleteDocument(id: string): Promise<boolean>;

// Revisions  
getDocumentRevisions(documentId: string): Promise<DocumentRevision[]>;
getRevisionById(id: string): Promise<DocumentRevision | undefined>;
createRevision(data: InsertDocumentRevision): Promise<DocumentRevision>;
updateRevision(id: string, data: Partial<InsertDocumentRevision>): Promise<DocumentRevision | undefined>;

// Distribution
getDistributions(documentId: string): Promise<DocumentDistribution[]>;
createDistribution(data: InsertDocumentDistribution): Promise<DocumentDistribution>;
acknowledgeDistribution(id: string): Promise<DocumentDistribution | undefined>;

// Reviews
getDocumentReviews(documentId: string): Promise<DocumentReview[]>;
getPendingReviews(): Promise<DocumentReview[]>;
getOverdueReviews(): Promise<DocumentReview[]>;
createDocumentReview(data: InsertDocumentReview): Promise<DocumentReview>;
updateDocumentReview(id: string, data: Partial<InsertDocumentReview>): Promise<DocumentReview | undefined>;

// Links
getDocumentLinks(documentId: string): Promise<DocumentLink[]>;
createDocumentLink(data: InsertDocumentLink): Promise<DocumentLink>;
deleteDocumentLink(id: string): Promise<boolean>;

// Metrics
getDocumentMetrics(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  overdueReviews: number;
  pendingApprovals: number;
}>;
```

### 5. Seed Data (add section in seed.ts)

Add this section inside the seed() function:

```typescript
// ============================================================
// DOCUMENT CONTROL SEED DATA
// ============================================================
console.log('Seeding Document Control...');

// Create sample documents
const doc1 = await storage.createDocument({
  docNumber: 'WI-MOL-001',
  title: 'Injection Molding Setup Procedure',
  type: 'work_instruction',
  category: 'Molding',
  department: 'Production',
  currentRev: 'C',
  status: 'effective',
  owner: 'John Smith',
  effectiveDate: new Date('2024-01-15'),
  reviewDueDate: new Date('2025-01-15'),
  reviewCycleDays: 365,
  retentionYears: 7,
  description: 'Step-by-step procedure for setting up injection molding machines including material preparation, machine parameters, and first article inspection.',
  isExternal: false,
  tags: ['molding', 'setup', 'production'],
});

const doc2 = await storage.createDocument({
  docNumber: 'SP-QA-001',
  title: 'Incoming Material Inspection Specification',
  type: 'specification',
  category: 'Quality',
  department: 'Quality Assurance',
  currentRev: 'B',
  status: 'effective',
  owner: 'Jane Doe',
  effectiveDate: new Date('2024-02-01'),
  reviewDueDate: new Date('2025-02-01'),
  reviewCycleDays: 365,
  description: 'Specifications for inspecting incoming raw materials including resin, colorants, and additives.',
  isExternal: false,
  tags: ['incoming', 'inspection', 'materials'],
});

const doc3 = await storage.createDocument({
  docNumber: 'FM-QC-001',
  title: 'First Article Inspection Report Form',
  type: 'form',
  category: 'Quality',
  department: 'Quality Control',
  currentRev: 'A',
  status: 'effective',
  owner: 'Mike Johnson',
  effectiveDate: new Date('2024-03-01'),
  reviewDueDate: new Date('2025-03-01'),
  description: 'Form template for documenting first article inspection results.',
  isExternal: false,
  tags: ['form', 'first-article', 'inspection'],
});

const doc4 = await storage.createDocument({
  docNumber: 'POL-QA-001',
  title: 'Quality Policy Manual',
  type: 'policy',
  category: 'Quality',
  department: 'Quality Management',
  currentRev: 'D',
  status: 'effective',
  owner: 'Quality Director',
  effectiveDate: new Date('2024-01-01'),
  reviewDueDate: new Date('2025-01-01'),
  description: 'Company quality policy and objectives in accordance with IATF 16949.',
  isExternal: false,
  tags: ['policy', 'iatf', 'quality-system'],
});

const doc5 = await storage.createDocument({
  docNumber: 'STD-IATF-001',
  title: 'IATF 16949:2016 Standard',
  type: 'standard',
  category: 'Quality',
  department: 'Quality Management',
  currentRev: '-',
  status: 'effective',
  owner: 'Quality Director',
  effectiveDate: new Date('2016-10-01'),
  isExternal: true,
  externalRef: 'https://www.iatfglobaloversight.org/',
  description: 'International Automotive Task Force quality management system standard.',
  tags: ['standard', 'iatf', 'external'],
});

// Create revision history for doc1 (WI-MOL-001)
const rev1A = await storage.createRevision({
  documentId: doc1.id,
  rev: 'A',
  changeDescription: 'Initial release',
  status: 'superseded',
  author: 'John Smith',
  approvedBy: 'Quality Manager',
  approvedAt: new Date('2023-01-15'),
  effectiveDate: new Date('2023-01-15'),
  supersededDate: new Date('2023-07-01'),
});

const rev1B = await storage.createRevision({
  documentId: doc1.id,
  rev: 'B',
  changeDescription: 'Updated pack pressure parameters per process validation results',
  status: 'superseded',
  author: 'John Smith',
  approvedBy: 'Quality Manager',
  approvedAt: new Date('2023-07-01'),
  effectiveDate: new Date('2023-07-01'),
  supersededDate: new Date('2024-01-15'),
});

const rev1C = await storage.createRevision({
  documentId: doc1.id,
  rev: 'C',
  changeDescription: 'Added safety lockout procedure for mold changes',
  status: 'effective',
  author: 'John Smith',
  approvedBy: 'Quality Manager',
  approvedAt: new Date('2024-01-15'),
  effectiveDate: new Date('2024-01-15'),
});

// Create revision history for doc2 (SP-QA-001)
const rev2A = await storage.createRevision({
  documentId: doc2.id,
  rev: 'A',
  changeDescription: 'Initial release',
  status: 'superseded',
  author: 'Jane Doe',
  approvedBy: 'Quality Director',
  approvedAt: new Date('2023-06-01'),
  effectiveDate: new Date('2023-06-01'),
  supersededDate: new Date('2024-02-01'),
});

const rev2B = await storage.createRevision({
  documentId: doc2.id,
  rev: 'B',
  changeDescription: 'Added incoming inspection for new resin supplier',
  status: 'effective',
  author: 'Jane Doe',
  approvedBy: 'Quality Director',
  approvedAt: new Date('2024-02-01'),
  effectiveDate: new Date('2024-02-01'),
});

// Create distribution records for doc1
await storage.createDistribution({
  documentId: doc1.id,
  revisionId: rev1C.id,
  recipientName: 'Production Supervisor',
  recipientRole: 'Supervisor',
  method: 'electronic',
  acknowledgedAt: new Date('2024-01-16'),
});

await storage.createDistribution({
  documentId: doc1.id,
  revisionId: rev1C.id,
  recipientName: 'Molding Operator Team',
  recipientRole: 'Operator',
  method: 'electronic',
  // Not yet acknowledged
});

// Create pending periodic review for doc3 (due in 30 days)
await storage.createDocumentReview({
  documentId: doc3.id,
  revisionId: null, // Will be assigned when review starts
  reviewerName: 'Mike Johnson',
  reviewerRole: 'Document Owner',
  status: 'pending',
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
});

// Create document link (WI-MOL-001 references Injection Molding process)
// Note: This assumes the Injection Molding process exists from previous seed
const injectionMoldingProcess = await db.select().from(processDef).where(eq(processDef.name, 'Injection Molding')).limit(1);
if (injectionMoldingProcess.length > 0) {
  await storage.createDocumentLink({
    sourceDocId: doc1.id,
    targetType: 'process',
    targetId: injectionMoldingProcess[0].id,
    linkType: 'references',
  });
}

console.log('Document Control seed complete!');
console.log(`  - ${5} documents created`);
console.log(`  - ${5} revisions created`);
console.log(`  - ${2} distributions created`);
console.log(`  - ${1} pending review created`);
console.log(`  - ${1} document link created`);
```

---

## IMPORT UPDATES NEEDED

### In storage.ts, update the import statement (line 2):
Add these to the existing import:
```typescript
import {
  // ... existing imports ...
  document,
  documentRevision,
  documentDistribution,
  documentReview,
  documentLink,
  type Document,
  type InsertDocument,
  type DocumentRevision,
  type InsertDocumentRevision,
  type DocumentDistribution,
  type InsertDocumentDistribution,
  type DocumentReview,
  type InsertDocumentReview,
  type DocumentLink,
  type InsertDocumentLink,
} from "@shared/schema";
```

### In seed.ts, update the import statement (line 2):
Add these to the existing import:
```typescript
import {
  // ... existing imports ...
  document,
  documentRevision,
  documentDistribution,
  documentReview,
  documentLink,
} from '@shared/schema';
```

---

## ACCEPTANCE CRITERIA CHECKLIST

Before marking complete, verify:

- [ ] **Enums created:**
  - [ ] `documentTypeEnum` with 10 values
  - [ ] `documentReviewStatusEnum` with 4 values

- [ ] **Tables created (5 total):**
  - [ ] `document` with 17 columns, unique index on docNumber
  - [ ] `documentRevision` with 13 columns, FK to document
  - [ ] `documentDistribution` with 9 columns, FKs to document and documentRevision
  - [ ] `documentReview` with 10 columns, FKs to document and documentRevision
  - [ ] `documentLink` with 6 columns, FK to document

- [ ] **Relations defined:**
  - [ ] `documentRelations` with many: revisions, distributions, reviews, links
  - [ ] `documentRevisionRelations` with one: document
  - [ ] `documentDistributionRelations` with one: document, revision
  - [ ] `documentReviewRelations` with one: document, revision
  - [ ] `documentLinkRelations` with one: sourceDoc

- [ ] **Insert schemas created:**
  - [ ] `insertDocumentSchema`
  - [ ] `insertDocumentRevisionSchema`
  - [ ] `insertDocumentDistributionSchema`
  - [ ] `insertDocumentReviewSchema`
  - [ ] `insertDocumentLinkSchema`

- [ ] **Types exported:**
  - [ ] `Document`, `InsertDocument`
  - [ ] `DocumentRevision`, `InsertDocumentRevision`
  - [ ] `DocumentDistribution`, `InsertDocumentDistribution`
  - [ ] `DocumentReview`, `InsertDocumentReview`
  - [ ] `DocumentLink`, `InsertDocumentLink`

- [ ] **Storage methods added (20 total):**
  - [ ] 6 document methods (getDocuments, getDocumentById, getDocumentByNumber, create, update, delete)
  - [ ] 4 revision methods (getDocumentRevisions, getRevisionById, create, update)
  - [ ] 3 distribution methods (getDistributions, create, acknowledge)
  - [ ] 5 review methods (getDocumentReviews, getPendingReviews, getOverdueReviews, create, update)
  - [ ] 3 link methods (getDocumentLinks, create, delete)
  - [ ] 1 metrics method (getDocumentMetrics)

- [ ] **Seed data created:**
  - [ ] 5 documents with varied types and statuses
  - [ ] 5 revisions with revision history
  - [ ] 2 distribution records (1 acknowledged, 1 pending)
  - [ ] 1 pending periodic review
  - [ ] 1 document link to process

- [ ] **Commands succeed:**
  - [ ] `npx drizzle-kit push` (no errors)
  - [ ] TypeScript compiles without errors
  - [ ] Server starts without errors
