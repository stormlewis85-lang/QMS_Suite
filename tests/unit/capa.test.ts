import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// CAPA Unit Tests – Pure business logic (no database or API calls)
// ═══════════════════════════════════════════════════════════════════════════

// ── 1. CAPA Number Format Helpers ────────────────────────────────────────

const CAPA_NUMBER_REGEX = /^CAPA-\d{4}-\d{4}$/;

function formatCapaNumber(year: number, sequence: number): string {
  const paddedSeq = String(sequence).padStart(4, '0');
  return `CAPA-${year}-${paddedSeq}`;
}

function isValidCapaNumber(capaNumber: string): boolean {
  return CAPA_NUMBER_REGEX.test(capaNumber);
}

function extractYear(capaNumber: string): number | null {
  const match = capaNumber.match(/^CAPA-(\d{4})-\d{4}$/);
  return match ? parseInt(match[1], 10) : null;
}

function extractSequence(capaNumber: string): number | null {
  const match = capaNumber.match(/^CAPA-\d{4}-(\d{4})$/);
  return match ? parseInt(match[1], 10) : null;
}

function nextCapaNumber(currentNumber: string): string {
  const year = extractYear(currentNumber);
  const seq = extractSequence(currentNumber);
  if (year === null || seq === null) throw new Error('Invalid CAPA number');
  return formatCapaNumber(year, seq + 1);
}

// ── 2. Status Transition Logic ───────────────────────────────────────────

type DisciplineStatus =
  | 'd0_awareness' | 'd1_team' | 'd2_problem'
  | 'd3_containment' | 'd4_root_cause' | 'd5_corrective'
  | 'd6_validation' | 'd7_preventive' | 'd8_closure';

type SpecialStatus = 'on_hold' | 'closed' | 'cancelled' | 'reopened';

type CapaStatus = DisciplineStatus | SpecialStatus;

const DISCIPLINE_ORDER: DisciplineStatus[] = [
  'd0_awareness', 'd1_team', 'd2_problem',
  'd3_containment', 'd4_root_cause', 'd5_corrective',
  'd6_validation', 'd7_preventive', 'd8_closure',
];

function getDisciplineIndex(status: DisciplineStatus): number {
  return DISCIPLINE_ORDER.indexOf(status);
}

function isDisciplineStatus(status: CapaStatus): status is DisciplineStatus {
  return DISCIPLINE_ORDER.includes(status as DisciplineStatus);
}

function canTransition(from: CapaStatus, to: CapaStatus): boolean {
  // Cannot transition from cancelled (terminal state)
  if (from === 'cancelled') return false;

  // Cannot transition from closed EXCEPT to reopened
  if (from === 'closed') return to === 'reopened';

  // Reopened goes back to d0_awareness to restart investigation
  if (from === 'reopened') {
    return isDisciplineStatus(to) || to === 'on_hold' || to === 'cancelled';
  }

  // Any active status (discipline or on_hold) can go to cancelled
  if (to === 'cancelled') return true;

  // Any discipline status can go to on_hold
  if (isDisciplineStatus(from) && to === 'on_hold') return true;

  // on_hold can go back to any discipline status
  if (from === 'on_hold' && isDisciplineStatus(to)) return true;

  // Forward discipline transitions only (no backward)
  if (isDisciplineStatus(from) && isDisciplineStatus(to)) {
    const fromIdx = getDisciplineIndex(from);
    const toIdx = getDisciplineIndex(to);
    return toIdx === fromIdx + 1;
  }

  // d8_closure can transition to closed
  if (from === 'd8_closure' && to === 'closed') return true;

  return false;
}

// ── 3. Discipline Completion Validators ──────────────────────────────────

interface D0Data {
  symptomsCaptured: number;
  emergencyResponseRequired: number;
  emergencyActions: Array<{ completed: boolean }>;
}

function validateD0(data: D0Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (data.symptomsCaptured !== 1) {
    errors.push('Symptoms must be captured');
  }
  if (data.emergencyResponseRequired === 1) {
    const allCompleted = data.emergencyActions.length > 0 &&
      data.emergencyActions.every(a => a.completed);
    if (!allCompleted) {
      errors.push('All emergency actions must be completed when emergency response is required');
    }
  }
  return { valid: errors.length === 0, errors };
}

interface D1Data {
  hasChampion: boolean;
  hasLeader: boolean;
  teamMemberCount: number;
  charterDefined: number;
}

function validateD1(data: D1Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.hasChampion) errors.push('Champion must be assigned');
  if (!data.hasLeader) errors.push('Leader must be assigned');
  if (data.teamMemberCount < 3) errors.push('Minimum 3 team members required');
  if (data.charterDefined !== 1) errors.push('Team charter must be defined');
  return { valid: errors.length === 0, errors };
}

interface D2Data {
  problemStatement: string;
  isIsNotAnalysis: Record<string, unknown>;
  measurementVerified: number;
}

function validateD2(data: D2Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.problemStatement || data.problemStatement.trim() === '') {
    errors.push('Problem statement is required');
  }
  if (!data.isIsNotAnalysis || Object.keys(data.isIsNotAnalysis).length === 0) {
    errors.push('Is/Is Not analysis is required');
  }
  if (data.measurementVerified !== 1) {
    errors.push('Measurement system must be verified');
  }
  return { valid: errors.length === 0, errors };
}

interface D3Action {
  implemented: boolean;
}

interface D3Data {
  containmentRequired: number;
  actions: D3Action[];
  effectivenessVerified: number;
}

function validateD3(data: D3Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (data.containmentRequired === 1) {
    if (data.actions.length === 0) {
      errors.push('At least one containment action is required');
    }
    const allImplemented = data.actions.every(a => a.implemented);
    if (!allImplemented) {
      errors.push('All containment actions must be implemented');
    }
    if (data.effectivenessVerified !== 1) {
      errors.push('Containment effectiveness must be verified');
    }
  }
  return { valid: errors.length === 0, errors };
}

interface D4Data {
  rootCauseOccurrenceVerified: number;
  rootCauseEscapeVerified: number;
}

function validateD4(data: D4Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (data.rootCauseOccurrenceVerified !== 1) {
    errors.push('Occurrence root cause must be verified');
  }
  if (data.rootCauseEscapeVerified !== 1) {
    errors.push('Escape root cause must be verified');
  }
  return { valid: errors.length === 0, errors };
}

interface D5Data {
  correctiveActions: Array<{ id: string }>;
  managementApprovalStatus: string;
}

function validateD5(data: D5Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (data.correctiveActions.length === 0) {
    errors.push('At least one corrective action is required');
  }
  if (data.managementApprovalStatus !== 'approved') {
    errors.push('Management approval is required');
  }
  return { valid: errors.length === 0, errors };
}

interface D6Data {
  actions: Array<{ implemented: boolean }>;
  effectivenessVerified: number;
}

function validateD6(data: D6Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allImplemented = data.actions.length > 0 && data.actions.every(a => a.implemented);
  if (!allImplemented) {
    errors.push('All actions must be implemented');
  }
  if (data.effectivenessVerified !== 1) {
    errors.push('Effectiveness must be verified');
  }
  return { valid: errors.length === 0, errors };
}

interface D7Data {
  preventiveActions: Array<{ id: string }>;
  horizontalDeploymentStarted: boolean;
}

function validateD7(data: D7Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (data.preventiveActions.length === 0) {
    errors.push('At least one preventive action is required');
  }
  if (!data.horizontalDeploymentStarted) {
    errors.push('Horizontal deployment must be started');
  }
  return { valid: errors.length === 0, errors };
}

interface D8Data {
  closureCriteriaMet: number;
  approvalObtained: boolean;
}

function validateD8(data: D8Data): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (data.closureCriteriaMet !== 1) {
    errors.push('All closure criteria must be met');
  }
  if (!data.approvalObtained) {
    errors.push('Closure approval must be obtained');
  }
  return { valid: errors.length === 0, errors };
}

// ── 4. Team Constraint Helpers ───────────────────────────────────────────

interface TeamMember {
  id: string;
  capaId: number;
  userId: string;
  userName: string;
  isChampion: number;
  isLeader: number;
  joinedAt: Date;
  leftAt: Date | null;
  leftReason: string | null;
}

function validateTeamConstraints(
  members: TeamMember[],
  newMember?: Partial<TeamMember>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const activeMembers = members.filter(m => m.leftAt === null);

  if (newMember) {
    // Check for duplicate (same userId + capaId still active)
    const isDuplicate = activeMembers.some(
      m => m.userId === newMember.userId && m.capaId === newMember.capaId,
    );
    if (isDuplicate) {
      errors.push('Duplicate team member: same user already active on this CAPA');
    }
  }

  // Count champions and leaders among active members
  const champions = activeMembers.filter(m => m.isChampion === 1);
  const leaders = activeMembers.filter(m => m.isLeader === 1);

  if (champions.length > 1) {
    errors.push('Only one champion allowed per CAPA');
  }
  if (leaders.length > 1) {
    errors.push('Only one leader allowed per CAPA');
  }

  return { valid: errors.length === 0, errors };
}

function validateMemberRemoval(
  member: TeamMember,
  allMembers: TeamMember[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!member.leftReason || member.leftReason.trim() === '') {
    errors.push('Reason is required when removing a team member');
  }

  // Cannot remove last champion without replacement
  if (member.isChampion === 1) {
    const otherActiveChampions = allMembers.filter(
      m => m.id !== member.id && m.isChampion === 1 && m.leftAt === null,
    );
    if (otherActiveChampions.length === 0) {
      errors.push('Cannot remove the last champion without a replacement');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── 5. Audit Log Hash Chain ──────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  capaId: number;
  action: string;
  userId: string;
  timestamp: string;
  contentHash: string;
  previousHash: string | null;
}

function computeAuditHash(
  capaId: number,
  action: string,
  userId: string,
  timestamp: string,
  previousHash: string | null,
): string {
  const payload = `${capaId}|${action}|${userId}|${timestamp}|${previousHash || ''}`;
  return createHash('sha256').update(payload).digest('hex');
}

function validateHashChain(entries: AuditLogEntry[]): { valid: boolean; brokenAt: number | null } {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // First entry should have null previousHash
    if (i === 0 && entry.previousHash !== null) {
      return { valid: false, brokenAt: 0 };
    }

    // Subsequent entries: previousHash must match prior entry's contentHash
    if (i > 0 && entry.previousHash !== entries[i - 1].contentHash) {
      return { valid: false, brokenAt: i };
    }

    // Verify the hash itself
    const expectedHash = computeAuditHash(
      entry.capaId, entry.action, entry.userId, entry.timestamp, entry.previousHash,
    );
    if (entry.contentHash !== expectedHash) {
      return { valid: false, brokenAt: i };
    }
  }
  return { valid: true, brokenAt: null };
}

function detectDeletedEntries(entries: AuditLogEntry[]): boolean {
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].id !== i + 1) return true; // gap in sequential IDs
  }
  return false;
}

// ── 6. Priority Calculation ──────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low';

interface PriorityInput {
  severity: 'high' | 'medium' | 'low';
  urgency: 'high' | 'medium' | 'low';
  safetyRelated: boolean;
  regulatoryRelated: boolean;
  customerImpact: 'high' | 'medium' | 'low' | 'none';
}

function calculatePriority(input: PriorityInput): Priority {
  // Safety-related is always critical
  if (input.safetyRelated) return 'critical';

  // Regulatory-related is always critical
  if (input.regulatoryRelated) return 'critical';

  // Customer impact high + severity high is critical
  if (input.customerImpact === 'high' && input.severity === 'high') return 'critical';

  // High severity or high urgency alone = high
  if (input.severity === 'high' || input.urgency === 'high') return 'high';

  // Low severity + low urgency = low
  if (input.severity === 'low' && input.urgency === 'low') return 'low';

  // Everything else is medium
  return 'medium';
}

// ── 7. Metrics Calculation ───────────────────────────────────────────────

interface CapaRecord {
  id: number;
  createdAt: Date;
  closedAt: Date | null;
  targetClosureDate: Date | null;
  effectivenessVerified: number;
  recurrenceResult: string | null;
  category: string | null;
}

function averageCycleTimeDays(capas: CapaRecord[]): number | null {
  const closed = capas.filter(c => c.closedAt !== null);
  if (closed.length === 0) return null;
  const totalDays = closed.reduce((sum, c) => {
    const diffMs = c.closedAt!.getTime() - c.createdAt.getTime();
    return sum + diffMs / (1000 * 60 * 60 * 24);
  }, 0);
  return totalDays / closed.length;
}

function onTimeClosureRate(capas: CapaRecord[]): number | null {
  const closed = capas.filter(c => c.closedAt !== null && c.targetClosureDate !== null);
  if (closed.length === 0) return null;
  const onTime = closed.filter(c => c.closedAt!.getTime() <= c.targetClosureDate!.getTime());
  return onTime.length / closed.length;
}

function effectivenessRate(capas: CapaRecord[]): number | null {
  const verified = capas.filter(c => c.effectivenessVerified === 1 || c.effectivenessVerified === 0);
  // Only consider CAPAs that have been through verification (i.e., closed/validated)
  const checkedCapas = capas.filter(c => c.closedAt !== null);
  if (checkedCapas.length === 0) return null;
  const effective = checkedCapas.filter(c => c.effectivenessVerified === 1);
  return effective.length / checkedCapas.length;
}

function recurrenceRate(capas: CapaRecord[]): number | null {
  const checked = capas.filter(c => c.recurrenceResult !== null);
  if (checked.length === 0) return null;
  const recurred = checked.filter(c => c.recurrenceResult === 'recurred');
  return recurred.length / checked.length;
}

function filterByDateRange(capas: CapaRecord[], start: Date, end: Date): CapaRecord[] {
  return capas.filter(c => c.createdAt >= start && c.createdAt <= end);
}

interface ParetoItem {
  category: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

function computePareto(capas: CapaRecord[]): ParetoItem[] {
  const counts: Record<string, number> = {};
  for (const c of capas) {
    const cat = c.category || 'Uncategorized';
    counts[cat] = (counts[cat] || 0) + 1;
  }

  const total = capas.length;
  if (total === 0) return [];

  const sorted = Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  let cumulative = 0;
  return sorted.map(item => {
    const percentage = (item.count / total) * 100;
    cumulative += percentage;
    return {
      category: item.category,
      count: item.count,
      percentage: Math.round(percentage * 100) / 100,
      cumulativePercentage: Math.round(cumulative * 100) / 100,
    };
  });
}

type TrendDirection = 'increasing' | 'decreasing' | 'stable';

function computeTrend(periodCounts: number[]): TrendDirection {
  if (periodCounts.length < 2) return 'stable';
  const first = periodCounts[0];
  const last = periodCounts[periodCounts.length - 1];
  const threshold = 0.1; // 10% change threshold
  const changeRatio = (last - first) / (first || 1);
  if (changeRatio > threshold) return 'increasing';
  if (changeRatio < -threshold) return 'decreasing';
  return 'stable';
}


// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('CAPA Module – Unit Tests', () => {

  // ── 1. CAPA Number Format ────────────────────────────────────────────

  describe('CAPA Number Format', () => {
    it('should validate a correct CAPA number format', () => {
      expect(isValidCapaNumber('CAPA-2026-0001')).toBe(true);
      expect(isValidCapaNumber('CAPA-2025-9999')).toBe(true);
    });

    it('should reject invalid CAPA number formats', () => {
      expect(isValidCapaNumber('CAR-2026-0001')).toBe(false);
      expect(isValidCapaNumber('CAPA-26-0001')).toBe(false);
      expect(isValidCapaNumber('CAPA-2026-01')).toBe(false);
      expect(isValidCapaNumber('CAPA-2026-00001')).toBe(false);
      expect(isValidCapaNumber('capa-2026-0001')).toBe(false);
      expect(isValidCapaNumber('')).toBe(false);
    });

    it('should pad sequence numbers to 4 digits', () => {
      expect(formatCapaNumber(2026, 1)).toBe('CAPA-2026-0001');
      expect(formatCapaNumber(2026, 10)).toBe('CAPA-2026-0010');
      expect(formatCapaNumber(2026, 100)).toBe('CAPA-2026-0100');
      expect(formatCapaNumber(2026, 1000)).toBe('CAPA-2026-1000');
    });

    it('should extract year from a valid CAPA number', () => {
      expect(extractYear('CAPA-2026-0001')).toBe(2026);
      expect(extractYear('CAPA-2025-0042')).toBe(2025);
      expect(extractYear('INVALID')).toBeNull();
    });

    it('should extract and increment the sequence number', () => {
      expect(extractSequence('CAPA-2026-0001')).toBe(1);
      expect(extractSequence('CAPA-2026-0042')).toBe(42);
      expect(nextCapaNumber('CAPA-2026-0001')).toBe('CAPA-2026-0002');
      expect(nextCapaNumber('CAPA-2026-0099')).toBe('CAPA-2026-0100');
      expect(nextCapaNumber('CAPA-2026-9999')).toBe('CAPA-2026-10000');
    });
  });

  // ── 2. Status Transitions ────────────────────────────────────────────

  describe('Status Transitions', () => {
    it('should allow forward discipline transitions (d0 -> d1)', () => {
      expect(canTransition('d0_awareness', 'd1_team')).toBe(true);
    });

    it('should allow sequential forward transitions (d1 -> d2, d2 -> d3, ...)', () => {
      expect(canTransition('d1_team', 'd2_problem')).toBe(true);
      expect(canTransition('d2_problem', 'd3_containment')).toBe(true);
      expect(canTransition('d3_containment', 'd4_root_cause')).toBe(true);
      expect(canTransition('d4_root_cause', 'd5_corrective')).toBe(true);
      expect(canTransition('d5_corrective', 'd6_validation')).toBe(true);
      expect(canTransition('d6_validation', 'd7_preventive')).toBe(true);
      expect(canTransition('d7_preventive', 'd8_closure')).toBe(true);
    });

    it('should allow the full path d0 -> d8 -> closed', () => {
      const path: CapaStatus[] = [
        'd0_awareness', 'd1_team', 'd2_problem', 'd3_containment',
        'd4_root_cause', 'd5_corrective', 'd6_validation',
        'd7_preventive', 'd8_closure', 'closed',
      ];
      for (let i = 0; i < path.length - 1; i++) {
        expect(canTransition(path[i], path[i + 1])).toBe(true);
      }
    });

    it('should allow any discipline status -> on_hold', () => {
      for (const ds of DISCIPLINE_ORDER) {
        expect(canTransition(ds, 'on_hold')).toBe(true);
      }
    });

    it('should allow on_hold -> back to a discipline status', () => {
      expect(canTransition('on_hold', 'd0_awareness')).toBe(true);
      expect(canTransition('on_hold', 'd4_root_cause')).toBe(true);
      expect(canTransition('on_hold', 'd8_closure')).toBe(true);
    });

    it('should allow any active status -> cancelled', () => {
      expect(canTransition('d0_awareness', 'cancelled')).toBe(true);
      expect(canTransition('d5_corrective', 'cancelled')).toBe(true);
      expect(canTransition('on_hold', 'cancelled')).toBe(true);
      expect(canTransition('d8_closure', 'cancelled')).toBe(true);
    });

    it('should NOT allow backward discipline transitions (d4 -> d3)', () => {
      expect(canTransition('d4_root_cause', 'd3_containment')).toBe(false);
      expect(canTransition('d2_problem', 'd0_awareness')).toBe(false);
      expect(canTransition('d8_closure', 'd7_preventive')).toBe(false);
    });

    it('should NOT allow skipping disciplines (d0 -> d2)', () => {
      expect(canTransition('d0_awareness', 'd2_problem')).toBe(false);
      expect(canTransition('d3_containment', 'd6_validation')).toBe(false);
    });

    it('should NOT allow transitions from closed (except reopened)', () => {
      expect(canTransition('closed', 'd0_awareness')).toBe(false);
      expect(canTransition('closed', 'on_hold')).toBe(false);
      expect(canTransition('closed', 'cancelled')).toBe(false);
    });

    it('should NOT allow transitions from cancelled (terminal)', () => {
      expect(canTransition('cancelled', 'd0_awareness')).toBe(false);
      expect(canTransition('cancelled', 'on_hold')).toBe(false);
      expect(canTransition('cancelled', 'reopened')).toBe(false);
      expect(canTransition('cancelled', 'closed')).toBe(false);
    });

    it('should allow closed -> reopened (special case)', () => {
      expect(canTransition('closed', 'reopened')).toBe(true);
    });

    it('should allow reopened -> discipline status to resume investigation', () => {
      expect(canTransition('reopened', 'd0_awareness')).toBe(true);
      expect(canTransition('reopened', 'd4_root_cause')).toBe(true);
    });
  });

  // ── 3. Discipline Completion Validation ──────────────────────────────

  describe('D0 – Awareness Validation', () => {
    it('should pass when symptoms captured and no emergency required', () => {
      const result = validateD0({
        symptomsCaptured: 1,
        emergencyResponseRequired: 0,
        emergencyActions: [],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when symptoms not captured', () => {
      const result = validateD0({
        symptomsCaptured: 0,
        emergencyResponseRequired: 0,
        emergencyActions: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Symptoms must be captured');
    });

    it('should pass when emergency required and all actions completed', () => {
      const result = validateD0({
        symptomsCaptured: 1,
        emergencyResponseRequired: 1,
        emergencyActions: [{ completed: true }, { completed: true }],
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when emergency required but actions incomplete', () => {
      const result = validateD0({
        symptomsCaptured: 1,
        emergencyResponseRequired: 1,
        emergencyActions: [{ completed: true }, { completed: false }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('All emergency actions must be completed when emergency response is required');
    });

    it('should fail when emergency required but no actions exist', () => {
      const result = validateD0({
        symptomsCaptured: 1,
        emergencyResponseRequired: 1,
        emergencyActions: [],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('D1 – Team Formation Validation', () => {
    it('should pass with champion, leader, 3+ members, and charter', () => {
      const result = validateD1({
        hasChampion: true,
        hasLeader: true,
        teamMemberCount: 5,
        charterDefined: 1,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail without champion', () => {
      const result = validateD1({
        hasChampion: false,
        hasLeader: true,
        teamMemberCount: 3,
        charterDefined: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Champion must be assigned');
    });

    it('should fail without leader', () => {
      const result = validateD1({
        hasChampion: true,
        hasLeader: false,
        teamMemberCount: 3,
        charterDefined: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Leader must be assigned');
    });

    it('should fail with fewer than 3 team members', () => {
      const result = validateD1({
        hasChampion: true,
        hasLeader: true,
        teamMemberCount: 2,
        charterDefined: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Minimum 3 team members required');
    });

    it('should fail without charter defined', () => {
      const result = validateD1({
        hasChampion: true,
        hasLeader: true,
        teamMemberCount: 3,
        charterDefined: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Team charter must be defined');
    });
  });

  describe('D2 – Problem Description Validation', () => {
    it('should pass with all requirements met', () => {
      const result = validateD2({
        problemStatement: 'Widget fails under thermal stress',
        isIsNotAnalysis: { what_is: 'cracking', what_is_not: 'bending' },
        measurementVerified: 1,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail with empty problem statement', () => {
      const result = validateD2({
        problemStatement: '',
        isIsNotAnalysis: { what_is: 'cracking' },
        measurementVerified: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Problem statement is required');
    });

    it('should fail with whitespace-only problem statement', () => {
      const result = validateD2({
        problemStatement: '   ',
        isIsNotAnalysis: { what_is: 'cracking' },
        measurementVerified: 1,
      });
      expect(result.valid).toBe(false);
    });

    it('should fail without is/is not analysis', () => {
      const result = validateD2({
        problemStatement: 'Widget fails',
        isIsNotAnalysis: {},
        measurementVerified: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Is/Is Not analysis is required');
    });

    it('should fail without measurement verification', () => {
      const result = validateD2({
        problemStatement: 'Widget fails',
        isIsNotAnalysis: { what_is: 'cracking' },
        measurementVerified: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Measurement system must be verified');
    });
  });

  describe('D3 – Containment Validation', () => {
    it('should pass when containment not required', () => {
      const result = validateD3({
        containmentRequired: 0,
        actions: [],
        effectivenessVerified: 0,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when containment required but no actions', () => {
      const result = validateD3({
        containmentRequired: 1,
        actions: [],
        effectivenessVerified: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one containment action is required');
    });

    it('should fail when containment actions not all implemented', () => {
      const result = validateD3({
        containmentRequired: 1,
        actions: [{ implemented: true }, { implemented: false }],
        effectivenessVerified: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('All containment actions must be implemented');
    });

    it('should fail when effectiveness not verified', () => {
      const result = validateD3({
        containmentRequired: 1,
        actions: [{ implemented: true }],
        effectivenessVerified: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Containment effectiveness must be verified');
    });

    it('should pass when all containment criteria met', () => {
      const result = validateD3({
        containmentRequired: 1,
        actions: [{ implemented: true }, { implemented: true }],
        effectivenessVerified: 1,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('D4 – Root Cause Validation', () => {
    it('should pass when both root causes verified', () => {
      const result = validateD4({
        rootCauseOccurrenceVerified: 1,
        rootCauseEscapeVerified: 1,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when occurrence root cause not verified', () => {
      const result = validateD4({
        rootCauseOccurrenceVerified: 0,
        rootCauseEscapeVerified: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Occurrence root cause must be verified');
    });

    it('should fail when escape root cause not verified', () => {
      const result = validateD4({
        rootCauseOccurrenceVerified: 1,
        rootCauseEscapeVerified: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Escape root cause must be verified');
    });
  });

  describe('D5 – Corrective Action Validation', () => {
    it('should pass with actions and management approval', () => {
      const result = validateD5({
        correctiveActions: [{ id: 'ca-1' }],
        managementApprovalStatus: 'approved',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail with no corrective actions', () => {
      const result = validateD5({
        correctiveActions: [],
        managementApprovalStatus: 'approved',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one corrective action is required');
    });

    it('should fail without management approval', () => {
      const result = validateD5({
        correctiveActions: [{ id: 'ca-1' }],
        managementApprovalStatus: 'pending',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Management approval is required');
    });
  });

  describe('D6 – Validation Discipline', () => {
    it('should pass when all actions implemented and effectiveness verified', () => {
      const result = validateD6({
        actions: [{ implemented: true }, { implemented: true }],
        effectivenessVerified: 1,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when actions not all implemented', () => {
      const result = validateD6({
        actions: [{ implemented: true }, { implemented: false }],
        effectivenessVerified: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('All actions must be implemented');
    });

    it('should fail when no actions exist', () => {
      const result = validateD6({
        actions: [],
        effectivenessVerified: 1,
      });
      expect(result.valid).toBe(false);
    });

    it('should fail when effectiveness not verified', () => {
      const result = validateD6({
        actions: [{ implemented: true }],
        effectivenessVerified: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Effectiveness must be verified');
    });
  });

  describe('D7 – Preventive Action Validation', () => {
    it('should pass with preventive actions and horizontal deployment', () => {
      const result = validateD7({
        preventiveActions: [{ id: 'pa-1' }],
        horizontalDeploymentStarted: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail without preventive actions', () => {
      const result = validateD7({
        preventiveActions: [],
        horizontalDeploymentStarted: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one preventive action is required');
    });

    it('should fail without horizontal deployment started', () => {
      const result = validateD7({
        preventiveActions: [{ id: 'pa-1' }],
        horizontalDeploymentStarted: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Horizontal deployment must be started');
    });
  });

  describe('D8 – Closure Validation', () => {
    it('should pass when closure criteria met and approval obtained', () => {
      const result = validateD8({
        closureCriteriaMet: 1,
        approvalObtained: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when closure criteria not met', () => {
      const result = validateD8({
        closureCriteriaMet: 0,
        approvalObtained: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('All closure criteria must be met');
    });

    it('should fail when approval not obtained', () => {
      const result = validateD8({
        closureCriteriaMet: 1,
        approvalObtained: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Closure approval must be obtained');
    });
  });

  // ── 4. Team Constraints ──────────────────────────────────────────────

  describe('Team Constraints', () => {
    const baseMember = (overrides: Partial<TeamMember>): TeamMember => ({
      id: 'tm-1',
      capaId: 1,
      userId: 'user-1',
      userName: 'Alice',
      isChampion: 0,
      isLeader: 0,
      joinedAt: new Date(),
      leftAt: null,
      leftReason: null,
      ...overrides,
    });

    it('should allow only one champion per CAPA', () => {
      const members: TeamMember[] = [
        baseMember({ id: 'tm-1', userId: 'user-1', isChampion: 1 }),
        baseMember({ id: 'tm-2', userId: 'user-2', isChampion: 1 }),
      ];
      const result = validateTeamConstraints(members);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Only one champion allowed per CAPA');
    });

    it('should allow only one leader per CAPA', () => {
      const members: TeamMember[] = [
        baseMember({ id: 'tm-1', userId: 'user-1', isLeader: 1 }),
        baseMember({ id: 'tm-2', userId: 'user-2', isLeader: 1 }),
      ];
      const result = validateTeamConstraints(members);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Only one leader allowed per CAPA');
    });

    it('should allow champion and leader to be the same person', () => {
      const members: TeamMember[] = [
        baseMember({ id: 'tm-1', userId: 'user-1', isChampion: 1, isLeader: 1 }),
        baseMember({ id: 'tm-2', userId: 'user-2' }),
        baseMember({ id: 'tm-3', userId: 'user-3' }),
      ];
      const result = validateTeamConstraints(members);
      expect(result.valid).toBe(true);
    });

    it('should prevent duplicate active team members (same userId + capaId)', () => {
      const members: TeamMember[] = [
        baseMember({ id: 'tm-1', userId: 'user-1', capaId: 1 }),
      ];
      const newMember: Partial<TeamMember> = { userId: 'user-1', capaId: 1 };
      const result = validateTeamConstraints(members, newMember);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate team member: same user already active on this CAPA');
    });

    it('should allow same user if previously left (leftAt set)', () => {
      const members: TeamMember[] = [
        baseMember({ id: 'tm-1', userId: 'user-1', capaId: 1, leftAt: new Date(), leftReason: 'Reassigned' }),
      ];
      const newMember: Partial<TeamMember> = { userId: 'user-1', capaId: 1 };
      const result = validateTeamConstraints(members, newMember);
      expect(result.valid).toBe(true);
    });

    it('should require reason when removing member (leftReason required)', () => {
      const member = baseMember({ leftReason: null });
      const result = validateMemberRemoval(member, [member]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reason is required when removing a team member');
    });

    it('should allow role changes (valid team after change)', () => {
      const members: TeamMember[] = [
        baseMember({ id: 'tm-1', userId: 'user-1', isChampion: 1, isLeader: 0 }),
        baseMember({ id: 'tm-2', userId: 'user-2', isChampion: 0, isLeader: 1 }),
        baseMember({ id: 'tm-3', userId: 'user-3' }),
      ];
      // Simulate role swap: user-2 becomes champion, user-1 becomes leader
      members[0].isChampion = 0;
      members[0].isLeader = 1;
      members[1].isChampion = 1;
      members[1].isLeader = 0;
      const result = validateTeamConstraints(members);
      expect(result.valid).toBe(true);
    });

    it('should NOT allow removing last champion without replacement', () => {
      const champion = baseMember({ id: 'tm-1', userId: 'user-1', isChampion: 1 });
      const regular = baseMember({ id: 'tm-2', userId: 'user-2' });
      const removal = { ...champion, leftReason: 'Leaving project' };
      const result = validateMemberRemoval(removal, [champion, regular]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot remove the last champion without a replacement');
    });
  });

  // ── 5. Audit Log Hash Chain ──────────────────────────────────────────

  describe('Audit Log Hash Chain', () => {
    function buildChain(count: number): AuditLogEntry[] {
      const entries: AuditLogEntry[] = [];
      for (let i = 0; i < count; i++) {
        const prevHash = i === 0 ? null : entries[i - 1].contentHash;
        const timestamp = `2026-02-19T10:00:0${i}Z`;
        const hash = computeAuditHash(1, `action_${i}`, 'user-1', timestamp, prevHash);
        entries.push({
          id: i + 1,
          capaId: 1,
          action: `action_${i}`,
          userId: 'user-1',
          timestamp,
          contentHash: hash,
          previousHash: prevHash,
        });
      }
      return entries;
    }

    it('should produce null previousHash for first entry', () => {
      const chain = buildChain(1);
      expect(chain[0].previousHash).toBeNull();
    });

    it('should link each entry to the previous entry contentHash', () => {
      const chain = buildChain(3);
      expect(chain[1].previousHash).toBe(chain[0].contentHash);
      expect(chain[2].previousHash).toBe(chain[1].contentHash);
    });

    it('should validate a correct chain', () => {
      const chain = buildChain(5);
      const result = validateHashChain(chain);
      expect(result.valid).toBe(true);
      expect(result.brokenAt).toBeNull();
    });

    it('should detect tampering when a middle entry is modified', () => {
      const chain = buildChain(5);
      // Tamper with middle entry's action (changes its hash)
      chain[2].contentHash = 'tampered_hash_value_0000000000000000000000000000000000';
      const result = validateHashChain(chain);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(2);
    });

    it('should detect deleted entries via gap in sequential IDs', () => {
      const chain = buildChain(5);
      // Remove middle entry (id=3)
      const withGap = chain.filter(e => e.id !== 3);
      expect(detectDeletedEntries(withGap)).toBe(true);
      // Full chain should have no gaps
      expect(detectDeletedEntries(chain)).toBe(false);
    });
  });

  // ── 6. Priority Calculation ──────────────────────────────────────────

  describe('Priority Calculation', () => {
    it('should assign critical priority for safety-related issues', () => {
      expect(calculatePriority({
        severity: 'low',
        urgency: 'low',
        safetyRelated: true,
        regulatoryRelated: false,
        customerImpact: 'none',
      })).toBe('critical');
    });

    it('should assign critical priority for regulatory-related issues', () => {
      expect(calculatePriority({
        severity: 'low',
        urgency: 'low',
        safetyRelated: false,
        regulatoryRelated: true,
        customerImpact: 'none',
      })).toBe('critical');
    });

    it('should assign critical priority for high customer impact + high severity', () => {
      expect(calculatePriority({
        severity: 'high',
        urgency: 'medium',
        safetyRelated: false,
        regulatoryRelated: false,
        customerImpact: 'high',
      })).toBe('critical');
    });

    it('should assign medium priority for standard issues', () => {
      expect(calculatePriority({
        severity: 'medium',
        urgency: 'medium',
        safetyRelated: false,
        regulatoryRelated: false,
        customerImpact: 'medium',
      })).toBe('medium');
    });

    it('should assign low priority for low severity + low urgency', () => {
      expect(calculatePriority({
        severity: 'low',
        urgency: 'low',
        safetyRelated: false,
        regulatoryRelated: false,
        customerImpact: 'none',
      })).toBe('low');
    });
  });

  // ── 7. Metrics Calculation ───────────────────────────────────────────

  describe('Metrics Calculation', () => {
    const mkCapa = (overrides: Partial<CapaRecord>): CapaRecord => ({
      id: 1,
      createdAt: new Date('2026-01-01'),
      closedAt: null,
      targetClosureDate: null,
      effectivenessVerified: 0,
      recurrenceResult: null,
      category: null,
      ...overrides,
    });

    describe('Average Cycle Time', () => {
      it('should calculate average days from creation to closure', () => {
        const capas = [
          mkCapa({ id: 1, createdAt: new Date('2026-01-01'), closedAt: new Date('2026-01-11') }), // 10 days
          mkCapa({ id: 2, createdAt: new Date('2026-01-01'), closedAt: new Date('2026-01-21') }), // 20 days
        ];
        expect(averageCycleTimeDays(capas)).toBe(15);
      });

      it('should return null when no CAPAs are closed (zero division)', () => {
        const capas = [
          mkCapa({ id: 1 }),
          mkCapa({ id: 2 }),
        ];
        expect(averageCycleTimeDays(capas)).toBeNull();
      });
    });

    describe('On-Time Closure Rate', () => {
      it('should calculate on-time percentage', () => {
        const capas = [
          mkCapa({ id: 1, closedAt: new Date('2026-01-10'), targetClosureDate: new Date('2026-01-15') }), // on time
          mkCapa({ id: 2, closedAt: new Date('2026-01-20'), targetClosureDate: new Date('2026-01-15') }), // late
        ];
        expect(onTimeClosureRate(capas)).toBe(0.5);
      });

      it('should return null when no CAPAs have closure dates', () => {
        expect(onTimeClosureRate([mkCapa({ id: 1 })])).toBeNull();
      });
    });

    describe('Effectiveness Rate', () => {
      it('should calculate effectiveness among closed CAPAs', () => {
        const capas = [
          mkCapa({ id: 1, closedAt: new Date('2026-01-10'), effectivenessVerified: 1 }),
          mkCapa({ id: 2, closedAt: new Date('2026-01-15'), effectivenessVerified: 0 }),
          mkCapa({ id: 3, closedAt: new Date('2026-01-20'), effectivenessVerified: 1 }),
        ];
        // 2 out of 3 closed CAPAs verified effective
        const rate = effectivenessRate(capas);
        expect(rate).toBeCloseTo(0.6667, 3);
      });

      it('should return null when no CAPAs closed', () => {
        expect(effectivenessRate([mkCapa({ id: 1 })])).toBeNull();
      });
    });

    describe('Recurrence Rate', () => {
      it('should calculate recurrence among checked CAPAs', () => {
        const capas = [
          mkCapa({ id: 1, recurrenceResult: 'no_recurrence' }),
          mkCapa({ id: 2, recurrenceResult: 'recurred' }),
          mkCapa({ id: 3, recurrenceResult: 'no_recurrence' }),
          mkCapa({ id: 4, recurrenceResult: null }), // not checked
        ];
        // 1 recurred out of 3 checked
        const rate = recurrenceRate(capas);
        expect(rate).toBeCloseTo(0.3333, 3);
      });

      it('should return null when no CAPAs checked for recurrence', () => {
        expect(recurrenceRate([mkCapa({ id: 1, recurrenceResult: null })])).toBeNull();
      });
    });

    describe('Date Range Filter', () => {
      it('should filter CAPAs within the specified date range', () => {
        const capas = [
          mkCapa({ id: 1, createdAt: new Date('2026-01-01') }),
          mkCapa({ id: 2, createdAt: new Date('2026-02-15') }),
          mkCapa({ id: 3, createdAt: new Date('2026-03-01') }),
        ];
        const filtered = filterByDateRange(capas, new Date('2026-01-15'), new Date('2026-02-28'));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe(2);
      });
    });

    describe('Pareto Analysis', () => {
      it('should compute sorted categories with cumulative percentages', () => {
        const capas = [
          mkCapa({ id: 1, category: 'Process' }),
          mkCapa({ id: 2, category: 'Process' }),
          mkCapa({ id: 3, category: 'Process' }),
          mkCapa({ id: 4, category: 'Material' }),
          mkCapa({ id: 5, category: 'Material' }),
          mkCapa({ id: 6, category: 'Equipment' }),
        ];
        const pareto = computePareto(capas);

        expect(pareto).toHaveLength(3);
        // Process: 3/6 = 50%
        expect(pareto[0].category).toBe('Process');
        expect(pareto[0].count).toBe(3);
        expect(pareto[0].percentage).toBe(50);
        expect(pareto[0].cumulativePercentage).toBe(50);
        // Material: 2/6 = 33.33%
        expect(pareto[1].category).toBe('Material');
        expect(pareto[1].count).toBe(2);
        expect(pareto[1].cumulativePercentage).toBeCloseTo(83.33, 1);
        // Equipment: 1/6 = 16.67%
        expect(pareto[2].category).toBe('Equipment');
        expect(pareto[2].cumulativePercentage).toBe(100);
      });

      it('should return empty array for no CAPAs', () => {
        expect(computePareto([])).toEqual([]);
      });
    });

    describe('Trend Direction', () => {
      it('should detect increasing trend', () => {
        expect(computeTrend([5, 8, 12, 15])).toBe('increasing');
      });

      it('should detect decreasing trend', () => {
        expect(computeTrend([15, 12, 8, 5])).toBe('decreasing');
      });

      it('should detect stable trend', () => {
        expect(computeTrend([10, 10, 10, 10])).toBe('stable');
      });

      it('should return stable for single data point', () => {
        expect(computeTrend([10])).toBe('stable');
      });
    });
  });
});
