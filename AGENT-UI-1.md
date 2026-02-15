# AGENT-UI-1: Document Library, Viewer & Upload

**Read RALPH_PATTERNS.md first. All API endpoints must be complete.**

---

## Authentication

All pages are protected by `<ProtectedRoute>` wrapper in App.tsx.
The `useAuth()` hook provides:
- `user` - Current user with `orgId` and `organization` info
- `isAuthenticated` - Boolean
- `logout()` - Sign out function

No additional auth handling needed in individual pages.

---

## Mission

Build core document management UI:
- Document library with search and filters
- Document detail viewer with all tabs
- File upload wizard
- Create from template flow

---

## Pages

### 1. Documents.tsx - Enhanced Library

**Route:** `/documents`

**Features:**
- Full-text search (title, description, extracted text)
- Filter dropdowns: Type, Status, Department
- Sortable table columns
- Status badges (draft=gray, review=yellow, effective=green, superseded=blue, obsolete=red)
- Review due indicator (days until, ⚠️ if overdue)
- Checkout indicator (🔒 with hover showing who)
- Row click → `/documents/:id`
- Action buttons: New, Upload, From Template

**Table Columns:**
| Doc# | Title | Type | Status | Rev | Owner | Modified | Due |

**API:** `GET /api/documents`, `GET /api/documents/search?q=...`

---

### 2. DocumentDetail.tsx - Full Viewer

**Route:** `/documents/:id`

**Header:**
- Back button, Doc number, Title
- Status dropdown (for transitions)
- Revision indicator
- Action buttons: Download, Print, Edit, Workflow actions

**Tabs:**

#### Preview Tab
- PDF viewer for PDFs (use react-pdf or iframe)
- Image display for images
- "No preview" for other types
- Zoom controls, page navigation

#### Details Tab  
- Metadata form (read-only or editable based on status)
- Fields: Title, Type, Category, Department, Owner, Description

#### Files Tab
- File list with: icon, name, size, scan status
- Download buttons (plain + watermarked)
- Delete button (if editable)
- Drag-drop upload zone (if editable)

#### Workflow Tab
- Current workflow status
- Step timeline (completed ✅, current 🔄, pending ⏳)
- For each step: name, assignee, date/due, comments
- Action buttons if current user is assigned: Approve, Reject, Delegate
- Approve opens signature modal if required

#### Distribution Tab
- Distribution history grouped by date
- Per-recipient acknowledgment status
- Distribute button (if effective)
- Recall button

#### History Tab
- Revision list with dates and approvers
- Compare button between revisions
- View historical revision

#### Links Tab
- Outgoing links (this doc references...)
- Incoming links (referenced by...)
- Add/remove link buttons

**Conditional Actions by Status:**

| Status | Actions |
|--------|---------|
| Draft | Edit, Upload Files, Start Workflow, Delete |
| Review | View, Comment, Approve/Reject (if assigned) |
| Effective | Download, Print, Distribute, New Revision |
| Superseded | View, Download (watermarked only) |
| Obsolete | View only |

---

### 3. DocumentUpload.tsx - Upload Wizard

**Route:** `/documents/upload` or modal

**4-Step Wizard:**

**Step 1: Upload Files**
- Drag-drop zone
- File list with upload progress
- Virus scan status indicator
- Support: PDF, DOCX, XLSX, DWG, JPG, PNG

**Step 2: Metadata**
- Doc Number (auto-generate option)
- Title (required)
- Type dropdown (required)
- Category dropdown
- Department dropdown (required)
- Owner (defaults to current user)
- Description

**Step 3: Workflow Selection**
- Radio buttons for available workflows
- Shows workflow steps preview
- Checkbox: Start immediately vs save as draft

**Step 4: Review & Submit**
- Summary of all fields
- File preview thumbnail
- Confirmation checkbox
- Save Draft / Submit buttons

---

### 4. DocumentFromTemplate.tsx

**Route:** `/documents/from-template` or modal

**3-Step Wizard:**

**Step 1: Select Template**
- Grid of template cards
- Search/filter by type
- Shows: name, type, department, description

**Step 2: Fill Fields**
- Shows auto-populated values (doc number, revision, date)
- Form for user fields (title, description)
- Entity linkers (link to Part, link to Process)

**Step 3: Review & Create**
- Summary
- Create button

---

## Components to Create

### FileUploadZone.tsx
```typescript
interface Props {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}
```
Drag-drop with dashed border, file icon, helpful text.

### WorkflowTimeline.tsx
```typescript
interface Props {
  steps: Array<{
    stepNumber: number;
    stepName: string;
    status: 'completed' | 'current' | 'pending';
    assignedTo?: string;
    completedAt?: string;
    dueDate?: string;
    comments?: string;
  }>;
  onApprove?: (stepId: number) => void;
  onReject?: (stepId: number) => void;
  onDelegate?: (stepId: number) => void;
  canAct?: boolean;
}
```
Vertical timeline with step cards.

### DocumentStatusBadge.tsx
```typescript
interface Props {
  status: 'draft' | 'review' | 'effective' | 'superseded' | 'obsolete';
}
```
Colored badge using shadcn Badge.

### SignatureCaptureModal.tsx
```typescript
interface Props {
  open: boolean;
  meaning: string; // The statement being signed
  onSign: (data: { password: string }) => void;
  onCancel: () => void;
}
```
Modal with:
- Meaning statement (read-only)
- Password field
- Checkbox: "I understand this is legally binding"
- Sign button

### LinkEntityDialog.tsx
```typescript
interface Props {
  open: boolean;
  onLink: (targetType: string, targetId: number, linkType: string) => void;
  onClose: () => void;
}
```
Dialog with:
- Entity type dropdown (PFMEA, Control Plan, Part, etc.)
- Search field for entity
- Link type dropdown
- Create button

---

## State Management

Use React Query for all API calls:

```typescript
// List documents
const { data: documents } = useQuery({
  queryKey: ['documents', filters],
  queryFn: () => fetchDocuments(filters)
});

// Single document
const { data: document } = useQuery({
  queryKey: ['document', id],
  queryFn: () => fetchDocument(id)
});

// Mutations
const uploadMutation = useMutation({
  mutationFn: uploadFile,
  onSuccess: () => queryClient.invalidateQueries(['document', id, 'files'])
});
```

---

## API Integration

```typescript
// Documents
GET  /api/documents
GET  /api/documents/:id
POST /api/documents
PATCH /api/documents/:id

// Files
GET  /api/documents/:id/files
POST /api/documents/:id/files
GET  /api/document-files/:id/download
DELETE /api/document-files/:id

// Workflow
GET  /api/documents/:id/workflow
POST /api/documents/:id/start-workflow
POST /api/workflow-steps/:id/approve
POST /api/workflow-steps/:id/reject
POST /api/workflow-steps/:id/delegate

// Templates
GET  /api/document-templates
POST /api/documents/from-template

// Links
GET  /api/documents/:id/links
POST /api/documents/:id/links
DELETE /api/links/:id
```

---

## Validation Checklist

- [ ] Documents page loads with data
- [ ] Search filters results
- [ ] Status/type/department filters work
- [ ] Document detail loads all tabs
- [ ] Preview shows PDF/images
- [ ] Files tab allows upload/download
- [ ] Workflow tab shows steps
- [ ] Approve/Reject work with signature capture
- [ ] Distribution tab shows history
- [ ] Upload wizard creates document
- [ ] From template populates fields
- [ ] All loading states handled
- [ ] All error states handled
- [ ] No TypeScript errors
