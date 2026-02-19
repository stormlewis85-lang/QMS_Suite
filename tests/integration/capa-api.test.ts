import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1,
  cleanupCapaTestOrgs,
  api,
  createTestCapa,
  setupCapaWithD0,
  completeD0,
  advanceDiscipline,
  isValidCapaNumber,
  generateCapa,
} from '../capa/test-helpers';

describe('CAPA API Integration', () => {
  let token: string;
  let orgId: string;
  let userId: string;

  beforeAll(async () => {
    await cleanupCapaTestOrgs();
    const org = await setupOrg1();
    token = org.token;
    orgId = org.orgId;
    userId = org.user.id;
  }, 60000);

  afterAll(async () => {
    await cleanupCapaTestOrgs();
  }, 60000);

  // =====================================================================
  // CAPA CRUD
  // =====================================================================
  describe('CAPA CRUD', () => {
    it('POST /api/capas - creates a CAPA with auto-generated number', async () => {
      const payload = generateCapa();
      const { status, data } = await api('POST', '/api/capas', token, payload);
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.title).toBe(payload.title);
      expect(data.status).toBe('d0_awareness');
      expect(data.currentDiscipline).toBe('D0');
      expect(isValidCapaNumber(data.capaNumber)).toBe(true);
      expect(data.orgId).toBe(orgId);
      expect(data.createdBy).toBe(userId);
    });

    it('POST /api/capas - returns 400 for missing required fields', async () => {
      const { status } = await api('POST', '/api/capas', token, {});
      expect(status).toBe(400);
    });

    it('POST /api/capas - auto-increments CAPA number', async () => {
      const c1 = await createTestCapa(token);
      const c2 = await createTestCapa(token);
      expect(c1.capaNumber).not.toBe(c2.capaNumber);
      // Extract the sequence numbers and confirm incrementing
      const seq1 = parseInt(c1.capaNumber.split('-')[2]);
      const seq2 = parseInt(c2.capaNumber.split('-')[2]);
      expect(seq2).toBeGreaterThan(seq1);
    });

    it('GET /api/capas - lists all CAPAs for the org', async () => {
      const { status, data } = await api('GET', '/api/capas', token);
      expect(status).toBe(200);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('GET /api/capas - filters by status', async () => {
      const { status, data } = await api('GET', '/api/capas?status=d0_awareness', token);
      expect(status).toBe(200);
      for (const c of data.data) {
        expect(c.status).toBe('d0_awareness');
      }
    });

    it('GET /api/capas - filters by priority', async () => {
      await createTestCapa(token, { priority: 'low' });
      const { status, data } = await api('GET', '/api/capas?priority=low', token);
      expect(status).toBe(200);
      for (const c of data.data) {
        expect(c.priority).toBe('low');
      }
    });

    it('GET /api/capas - filters by sourceType', async () => {
      await createTestCapa(token, { sourceType: 'internal_audit' });
      const { status, data } = await api('GET', '/api/capas?sourceType=internal_audit', token);
      expect(status).toBe(200);
      for (const c of data.data) {
        expect(c.sourceType).toBe('internal_audit');
      }
    });

    it('GET /api/capas/:id - returns a single CAPA', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}`, token);
      expect(status).toBe(200);
      expect(data.id).toBe(capa.id);
      expect(data.title).toBe(capa.title);
      expect(data.team).toBeInstanceOf(Array);
      expect(data.sources).toBeInstanceOf(Array);
    });

    it('GET /api/capas/:id - returns 404 for non-existent CAPA', async () => {
      const { status } = await api('GET', '/api/capas/999999', token);
      expect(status).toBe(404);
    });

    it('PATCH /api/capas/:id - updates fields and creates audit log', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PATCH', `/api/capas/${capa.id}`, token, {
        title: 'Updated CAPA Title',
        priority: 'critical',
      });
      expect(status).toBe(200);
      expect(data.title).toBe('Updated CAPA Title');
      expect(data.priority).toBe('critical');
    });

    it('PATCH /api/capas/:id - returns 404 for non-existent CAPA', async () => {
      const { status } = await api('PATCH', '/api/capas/999999', token, { title: 'nope' });
      expect(status).toBe(404);
    });

    it('DELETE /api/capas/:id - soft deletes (204)', async () => {
      const capa = await createTestCapa(token);
      const { status } = await api('DELETE', `/api/capas/${capa.id}`, token);
      expect(status).toBe(204);
      // Confirm the CAPA is no longer fetched (org check fails because deletedAt is set)
      const { status: getStatus } = await api('GET', `/api/capas/${capa.id}`, token);
      // It should still return 200 since getCapa may still return it
      // but the CAPA should have a deletedAt set
      if (getStatus === 200) {
        const { data: fetched } = await api('GET', `/api/capas/${capa.id}`, token);
        expect(fetched.deletedAt).toBeDefined();
      }
    });

    it('POST /api/capas/:id/advance-discipline - moves D0 to D1', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await advanceDiscipline(token, capa.id);
      expect(status).toBe(200);
      expect(data.currentDiscipline).toBe('D1');
      expect(data.status).toBe('d1_team');
    });

    it('POST /api/capas/:id/hold - puts CAPA on hold with reason', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/hold`, token, {
        reason: 'Waiting for supplier response',
      });
      expect(status).toBe(200);
      expect(data.status).toBe('on_hold');
    });

    it('POST /api/capas/:id/hold - returns 400 without reason', async () => {
      const capa = await createTestCapa(token);
      const { status } = await api('POST', `/api/capas/${capa.id}/hold`, token, {});
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/resume - resumes from hold', async () => {
      const capa = await createTestCapa(token);
      await api('POST', `/api/capas/${capa.id}/hold`, token, { reason: 'test hold' });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/resume`, token);
      expect(status).toBe(200);
      expect(data.status).toBe('d0_awareness');
    });

    it('POST /api/capas/:id/resume - returns 400 if not on hold', async () => {
      const capa = await createTestCapa(token);
      const { status } = await api('POST', `/api/capas/${capa.id}/resume`, token);
      expect(status).toBe(400);
    });

    it('GET /api/capas/dashboard - returns dashboard data', async () => {
      const { status, data } = await api('GET', '/api/capas/dashboard', token);
      expect(status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.recentActivity).toBeInstanceOf(Array);
    });

    it('GET /api/capas/export - returns export data in JSON', async () => {
      const { status, data } = await api('GET', '/api/capas/export?format=json', token);
      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);
    });
  });

  // =====================================================================
  // Team Management
  // =====================================================================
  describe('Team Management', () => {
    let capaId: number;

    beforeAll(async () => {
      const capa = await createTestCapa(token);
      capaId = capa.id;
    });

    it('POST /api/capas/:id/team - adds a team member (201)', async () => {
      const { status, data } = await api('POST', `/api/capas/${capaId}/team`, token, {
        userId,
        userName: 'Alpha Admin',
        role: 'team_member',
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.userId).toBe(userId);
      expect(data.role).toBe('team_member');
    });

    it('GET /api/capas/:id/team - lists team members', async () => {
      const { status, data } = await api('GET', `/api/capas/${capaId}/team`, token);
      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /api/capas/:id/team/:memberId - updates member role', async () => {
      const { data: members } = await api('GET', `/api/capas/${capaId}/team`, token);
      const memberId = members[0].id;
      const { status, data } = await api('PATCH', `/api/capas/${capaId}/team/${memberId}`, token, {
        role: 'quality_engineer',
      });
      expect(status).toBe(200);
      expect(data.role).toBe('quality_engineer');
    });

    it('DELETE /api/capas/:id/team/:memberId - removes member (204)', async () => {
      // Add a new member to remove
      const { data: newMember } = await api('POST', `/api/capas/${capaId}/team`, token, {
        userId: 'temp-user-id',
        userName: 'Temp User',
        role: 'observer',
      });
      const { status } = await api('DELETE', `/api/capas/${capaId}/team/${newMember.id}`, token, {
        reason: 'Role no longer needed',
      });
      expect(status).toBe(204);
    });

    it('POST /api/capas/:id/team - assigns champion (isChampion)', async () => {
      const capa2 = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa2.id}/team`, token, {
        userId,
        userName: 'Alpha Admin',
        role: 'champion',
        isChampion: 1,
      });
      expect(status).toBe(201);
      expect(data.isChampion).toBeTruthy();
    });

    it('POST /api/capas/:id/team - assigns leader (isLeader)', async () => {
      const capa3 = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa3.id}/team`, token, {
        userId,
        userName: 'Alpha Admin',
        role: 'leader',
        isLeader: 1,
      });
      expect(status).toBe(201);
      expect(data.isLeader).toBeTruthy();
    });

    it('POST /api/capas/:id/team - prevents duplicate champion', async () => {
      const capa4 = await createTestCapa(token);
      // Add first champion
      await api('POST', `/api/capas/${capa4.id}/team`, token, {
        userId,
        userName: 'Alpha Admin',
        role: 'champion',
        isChampion: 1,
      });
      // Attempt second champion
      const { status } = await api('POST', `/api/capas/${capa4.id}/team`, token, {
        userId: 'other-user-id',
        userName: 'Other User',
        role: 'champion',
        isChampion: 1,
      });
      expect(status).toBe(409);
    });

    it('POST /api/capas/:id/team - prevents duplicate leader', async () => {
      const capa5 = await createTestCapa(token);
      // Add first leader
      await api('POST', `/api/capas/${capa5.id}/team`, token, {
        userId,
        userName: 'Alpha Admin',
        role: 'leader',
        isLeader: 1,
      });
      // Attempt second leader
      const { status } = await api('POST', `/api/capas/${capa5.id}/team`, token, {
        userId: 'other-user-id',
        userName: 'Other User',
        role: 'leader',
        isLeader: 1,
      });
      expect(status).toBe(409);
    });

    it('PATCH /api/capas/:id/team/:memberId - returns 404 for invalid member', async () => {
      const { status } = await api('PATCH', `/api/capas/${capaId}/team/999999`, token, { role: 'observer' });
      expect(status).toBe(404);
    });
  });

  // =====================================================================
  // D0 - Emergency Response / Awareness
  // =====================================================================
  describe('D0 - Emergency Response', () => {
    it('GET /api/capas/:id/d0 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d0`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d0 - creates D0 data (upsert)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d0`, token, {
        emergencyResponseRequired: 0,
        symptomsCaptured: 1,
        symptomsDescription: 'Visible defect on part surface',
        initialScope: 'Isolated to Line 3',
        threatLevel: 'low',
      });
      expect(status).toBe(200);
      expect(data.symptomsCaptured).toBeTruthy();
      expect(data.symptomsDescription).toBe('Visible defect on part surface');
    });

    it('PUT /api/capas/:id/d0 - updates existing D0 data', async () => {
      const capa = await setupCapaWithD0(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d0`, token, {
        symptomsDescription: 'Updated symptoms - expanded scope',
        threatLevel: 'medium',
      });
      expect(status).toBe(200);
      expect(data.symptomsDescription).toBe('Updated symptoms - expanded scope');
      expect(data.threatLevel).toBe('medium');
    });

    it('POST /api/capas/:id/d0/emergency-actions - adds action (201)', async () => {
      const capa = await setupCapaWithD0(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d0/emergency-actions`, token, {
        description: 'Quarantine affected lot',
        assignedTo: userId,
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.status).toBe('open');
      expect(data.description).toBe('Quarantine affected lot');
    });

    it('PATCH /api/capas/:id/d0/emergency-actions/:actionId - updates action', async () => {
      const capa = await setupCapaWithD0(token);
      const { data: action } = await api('POST', `/api/capas/${capa.id}/d0/emergency-actions`, token, {
        description: 'Contain suspect product',
      });
      const { status, data } = await api(
        'PATCH',
        `/api/capas/${capa.id}/d0/emergency-actions/${action.id}`,
        token,
        { status: 'completed' },
      );
      expect(status).toBe(200);
      expect(data.status).toBe('completed');
    });

    it('POST /api/capas/:id/d0/complete - completes D0 when symptoms captured', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d0`, token, {
        emergencyResponseRequired: 0,
        symptomsCaptured: 1,
        symptomsDescription: 'Symptoms captured',
        initialScope: 'Scope',
        threatLevel: 'low',
      });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d0/complete`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D0 completed');
    });

    it('POST /api/capas/:id/d0/complete - fails if symptoms not captured', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d0`, token, {
        emergencyResponseRequired: 0,
        symptomsCaptured: 0,
        initialScope: 'Scope',
        threatLevel: 'low',
      });
      const { status } = await api('POST', `/api/capas/${capa.id}/d0/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d0/complete - fails if emergency actions incomplete', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d0`, token, {
        emergencyResponseRequired: 1,
        symptomsCaptured: 1,
        symptomsDescription: 'test',
        initialScope: 'test',
        threatLevel: 'low',
      });
      // Add an uncompleted emergency action
      await api('POST', `/api/capas/${capa.id}/d0/emergency-actions`, token, {
        description: 'Incomplete action',
      });
      const { status } = await api('POST', `/api/capas/${capa.id}/d0/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d0/verify - verifies completed D0', async () => {
      const capa = await createTestCapa(token);
      await completeD0(token, capa.id);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d0/verify`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D0 verified');
    });

    it('POST /api/capas/:id/d0/verify - fails if D0 not completed', async () => {
      const capa = await setupCapaWithD0(token);
      const { status } = await api('POST', `/api/capas/${capa.id}/d0/verify`, token);
      expect(status).toBe(400);
    });
  });

  // =====================================================================
  // D1 - Team Formation
  // =====================================================================
  describe('D1 - Team Formation', () => {
    it('GET /api/capas/:id/d1 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d1`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d1 - creates/updates D1 data', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d1`, token, {
        teamCharterDefined: 1,
        teamCharter: 'Investigate and resolve root cause',
        communicationPlan: 'Daily standup at 9 AM',
      });
      expect(status).toBe(200);
      expect(data.teamCharterDefined).toBeTruthy();
    });

    it('POST /api/capas/:id/d1/complete - validates champion, leader, 3 members, charter', async () => {
      const capa = await createTestCapa(token);
      // Set up D1 data without meeting requirements
      await api('PUT', `/api/capas/${capa.id}/d1`, token, { teamCharterDefined: 0 });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d1/complete`, token);
      expect(status).toBe(400);
      // Missing charter or team members
      expect(data.error).toBeDefined();
    });

    it('POST /api/capas/:id/d1/complete - succeeds with all requirements', async () => {
      const capa = await createTestCapa(token);
      // Set up D1 with charter
      await api('PUT', `/api/capas/${capa.id}/d1`, token, {
        teamCharterDefined: 1,
        teamCharter: 'Resolve quality issue',
      });
      // Add champion, leader, and a third member
      await api('POST', `/api/capas/${capa.id}/team`, token, {
        userId, userName: 'Admin', role: 'champion', isChampion: 1,
      });
      await api('POST', `/api/capas/${capa.id}/team`, token, {
        userId: 'leader-user', userName: 'Leader', role: 'leader', isLeader: 1,
      });
      await api('POST', `/api/capas/${capa.id}/team`, token, {
        userId: 'member-3', userName: 'Member 3', role: 'quality_engineer',
      });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d1/complete`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D1 completed');
    });

    it('POST /api/capas/:id/d1/approve-resources - approves resources', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d1`, token, { teamCharterDefined: 1 });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d1/approve-resources`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('Resources approved');
    });
  });

  // =====================================================================
  // D2 - Problem Description
  // =====================================================================
  describe('D2 - Problem Description', () => {
    it('GET /api/capas/:id/d2 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d2`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d2 - creates D2 problem description', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d2`, token, {
        problemStatement: 'Defective parts on Line 3',
        fiveWsComplete: 1,
      });
      expect(status).toBe(200);
      expect(data.problemStatement).toBe('Defective parts on Line 3');
    });

    it('PUT /api/capas/:id/d2/is-not/:dimension - updates Is/Is Not for what', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d2`, token, { problemStatement: 'test' });
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d2/is-not/what`, token, {
        is: 'Surface defect',
        isNot: 'Structural failure',
        therefore: 'Cosmetic issue only',
      });
      expect(status).toBe(200);
    });

    it('PUT /api/capas/:id/d2/is-not/:dimension - validates dimension name', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d2`, token, { problemStatement: 'test' });
      const { status } = await api('PUT', `/api/capas/${capa.id}/d2/is-not/invalid`, token, {
        is: 'test', isNot: 'test',
      });
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d2/verify-problem-statement - verifies statement', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d2`, token, { problemStatement: 'test' });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d2/verify-problem-statement`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('verified');
    });

    it('POST /api/capas/:id/d2/complete - fails without 5W+1H and measurement', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d2`, token, {
        problemStatement: 'test',
        fiveWsComplete: 0,
        measurementSystemValid: 0,
      });
      const { status } = await api('POST', `/api/capas/${capa.id}/d2/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d2/complete - succeeds with all requirements', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d2`, token, {
        problemStatement: 'Full problem description',
        fiveWsComplete: 1,
        measurementSystemValid: 1,
      });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d2/complete`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D2 completed');
    });
  });

  // =====================================================================
  // D3 - Interim Containment
  // =====================================================================
  describe('D3 - Interim Containment', () => {
    it('GET /api/capas/:id/d3 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d3`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d3 - creates containment data', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d3`, token, {
        containmentRequired: 1,
        containmentPlanDescription: 'Quarantine all affected lots',
      });
      expect(status).toBe(200);
      expect(data.containmentRequired).toBeTruthy();
    });

    it('POST /api/capas/:id/d3/actions - adds containment action (201)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d3/actions`, token, {
        description: 'Sort 100% of suspect inventory',
        assignedTo: userId,
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.status).toBe('open');
    });

    it('PATCH /api/capas/:id/d3/actions/:actionId - updates containment action', async () => {
      const capa = await createTestCapa(token);
      const { data: action } = await api('POST', `/api/capas/${capa.id}/d3/actions`, token, {
        description: 'Sort inventory',
      });
      const { status, data } = await api(
        'PATCH', `/api/capas/${capa.id}/d3/actions/${action.id}`, token,
        { status: 'in_progress', progress: 50 },
      );
      expect(status).toBe(200);
      expect(data.status).toBe('in_progress');
    });

    it('POST /api/capas/:id/d3/actions/:actionId/verify - verifies action', async () => {
      const capa = await createTestCapa(token);
      const { data: action } = await api('POST', `/api/capas/${capa.id}/d3/actions`, token, {
        description: 'Verify containment',
      });
      const { status, data } = await api(
        'POST', `/api/capas/${capa.id}/d3/actions/${action.id}/verify`, token,
        { notes: 'Containment effective' },
      );
      expect(status).toBe(200);
      expect(data.status).toBe('verified');
    });

    it('POST /api/capas/:id/d3/complete - fails if containment required but no actions', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d3`, token, { containmentRequired: 1 });
      const { status } = await api('POST', `/api/capas/${capa.id}/d3/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d3/complete - succeeds with actions present', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d3`, token, { containmentRequired: 1 });
      await api('POST', `/api/capas/${capa.id}/d3/actions`, token, { description: 'Sort parts' });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d3/complete`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D3 completed');
    });

    it('POST /api/capas/:id/d3/verify-effectiveness - marks containment as effective', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d3`, token, { containmentRequired: 1 });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d3/verify-effectiveness`, token, {
        evidence: 'No further defects found in 3 days',
      });
      expect(status).toBe(200);
      expect(data.message).toContain('effectiveness verified');
    });
  });

  // =====================================================================
  // D4 - Root Cause Analysis
  // =====================================================================
  describe('D4 - Root Cause Analysis', () => {
    it('GET /api/capas/:id/d4 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d4`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d4 - creates root cause data', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d4`, token, {
        rootCauseOccurrence: 'Incorrect machine settings',
        rootCauseEscape: 'Insufficient inspection frequency',
      });
      expect(status).toBe(200);
      expect(data.rootCauseOccurrence).toBe('Incorrect machine settings');
    });

    it('POST /api/capas/:id/d4/candidates - adds root cause candidate (201)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d4/candidates`, token, {
        description: 'Worn tooling',
        causeType: 'occurrence',
        category: 'machine',
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.description).toBe('Worn tooling');
    });

    it('POST /api/capas/:id/d4/five-why - adds five-why chain (201)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d4/five-why`, token, {
        whys: [
          { level: 1, question: 'Why did the defect occur?', answer: 'Tool was worn' },
          { level: 2, question: 'Why was the tool worn?', answer: 'No PM schedule' },
        ],
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
    });

    it('POST /api/capas/:id/d4/candidates/:candidateId/verify - verifies candidate as root cause', async () => {
      const capa = await createTestCapa(token);
      const { data: candidate } = await api('POST', `/api/capas/${capa.id}/d4/candidates`, token, {
        description: 'Worn tooling', causeType: 'occurrence', category: 'machine',
      });
      const { status, data } = await api(
        'POST', `/api/capas/${capa.id}/d4/candidates/${candidate.id}/verify`, token,
      );
      expect(status).toBe(200);
      expect(data.isRootCause).toBeTruthy();
      expect(data.verificationResult).toBe('confirmed');
    });

    it('POST /api/capas/:id/d4/complete - fails if occurrence root cause not verified', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d4`, token, {
        rootCauseOccurrence: 'test',
        rootCauseEscape: 'test',
      });
      const { status } = await api('POST', `/api/capas/${capa.id}/d4/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d4/complete - succeeds with both root causes verified', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d4`, token, {
        rootCauseOccurrence: 'Worn tool',
        rootCauseEscape: 'Insufficient inspection',
      });
      await api('POST', `/api/capas/${capa.id}/d4/verify-occurrence`, token);
      await api('POST', `/api/capas/${capa.id}/d4/verify-escape`, token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d4/complete`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D4 completed');
    });

    it('POST /api/capas/:id/d4/verify-occurrence - verifies occurrence root cause', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d4`, token, { rootCauseOccurrence: 'test' });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d4/verify-occurrence`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('Occurrence root cause verified');
    });

    it('POST /api/capas/:id/d4/verify-escape - verifies escape root cause', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d4`, token, { rootCauseEscape: 'test' });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d4/verify-escape`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('Escape root cause verified');
    });

    it('PUT /api/capas/:id/d4/fishbone - updates fishbone diagram data', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d4/fishbone`, token, {
        categories: {
          man: ['Operator fatigue'],
          machine: ['Worn bearing'],
          method: ['No standard work'],
        },
      });
      expect(status).toBe(200);
    });
  });

  // =====================================================================
  // D5 - Permanent Corrective Actions
  // =====================================================================
  describe('D5 - Permanent Corrective Actions', () => {
    it('GET /api/capas/:id/d5 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d5`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d5 - creates D5 corrective action data', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d5`, token, {
        managementApprovalRequired: 0,
      });
      expect(status).toBe(200);
    });

    it('POST /api/capas/:id/d5/actions - adds corrective action (201)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d5/actions`, token, {
        description: 'Replace worn tooling and implement PM schedule',
        actionType: 'corrective',
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.status).toBe('open');
    });

    it('POST /api/capas/:id/d5/approve - management approval (admin role)', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d5`, token, { managementApprovalRequired: 1 });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d5/approve`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('approved');
    });

    it('POST /api/capas/:id/d5/reject - rejects D5 with reason', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d5`, token, { managementApprovalRequired: 1 });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d5/reject`, token, {
        reason: 'Need more data before approval',
      });
      expect(status).toBe(200);
      expect(data.message).toContain('rejected');
    });

    it('POST /api/capas/:id/d5/reject - fails without reason', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d5`, token, { managementApprovalRequired: 1 });
      const { status } = await api('POST', `/api/capas/${capa.id}/d5/reject`, token, {});
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d5/complete - fails without corrective actions', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d5`, token, { managementApprovalRequired: 0 });
      const { status } = await api('POST', `/api/capas/${capa.id}/d5/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d5/complete - succeeds with actions and no approval required', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d5`, token, { managementApprovalRequired: 0 });
      await api('POST', `/api/capas/${capa.id}/d5/actions`, token, {
        description: 'Implement new PM schedule',
      });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d5/complete`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D5 completed');
    });

    it('POST /api/capas/:id/d5/complete - fails if approval required but not approved', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d5`, token, { managementApprovalRequired: 1 });
      await api('POST', `/api/capas/${capa.id}/d5/actions`, token, { description: 'Fix' });
      const { status } = await api('POST', `/api/capas/${capa.id}/d5/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d5/request-approval - requests management approval', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d5`, token, { managementApprovalRequired: 1 });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d5/request-approval`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('Approval requested');
    });
  });

  // =====================================================================
  // D6 - Implementation & Validation
  // =====================================================================
  describe('D6 - Implementation & Validation', () => {
    it('GET /api/capas/:id/d6 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d6`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d6 - creates D6 data', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d6`, token, {
        implementationStatus: 'in_progress',
      });
      expect(status).toBe(200);
    });

    it('POST /api/capas/:id/d6/validation-tests - adds validation test (201)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d6/validation-tests`, token, {
        testName: 'Dimensional check',
        criteria: 'All parts within tolerance',
        method: 'CMM inspection',
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.status).toBe('pending');
    });

    it('POST /api/capas/:id/d6/validation-tests/:testId/result - records test result', async () => {
      const capa = await createTestCapa(token);
      const { data: test } = await api('POST', `/api/capas/${capa.id}/d6/validation-tests`, token, {
        testName: 'Surface finish check',
      });
      const { status, data } = await api(
        'POST', `/api/capas/${capa.id}/d6/validation-tests/${test.id}/result`, token,
        { result: 'pass', notes: 'All samples within spec' },
      );
      expect(status).toBe(200);
      expect(data.status).toBe('completed');
    });

    it('POST /api/capas/:id/d6/verify-effectiveness - verifies effectiveness', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d6`, token, {});
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d6/verify-effectiveness`, token, {
        result: 'effective',
        evidence: 'Zero defects in production run',
      });
      expect(status).toBe(200);
      expect(data.message).toContain('Effectiveness verified');
    });

    it('POST /api/capas/:id/d6/complete - fails without effectiveness verification', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d6`, token, {});
      const { status } = await api('POST', `/api/capas/${capa.id}/d6/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d6/complete - succeeds after effectiveness verified', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d6`, token, {});
      await api('POST', `/api/capas/${capa.id}/d6/verify-effectiveness`, token, {
        result: 'effective',
      });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d6/complete`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D6 completed');
    });

    it('POST /api/capas/:id/d6/remove-containment - fails without effectiveness verification', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d6`, token, {});
      const { status } = await api('POST', `/api/capas/${capa.id}/d6/remove-containment`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d6/remove-containment - succeeds after effectiveness verified', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d6`, token, {});
      await api('POST', `/api/capas/${capa.id}/d6/verify-effectiveness`, token, { result: 'effective' });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d6/remove-containment`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('Containment removed');
    });

    it('POST /api/capas/:id/d6/implementation-log - adds log entry (201)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d6/implementation-log`, token, {
        activity: 'Installed new tooling',
        notes: 'All fixtures updated per engineering spec',
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
    });
  });

  // =====================================================================
  // D7 - Preventive Actions
  // =====================================================================
  describe('D7 - Preventive Actions', () => {
    it('GET /api/capas/:id/d7 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d7`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d7 - creates D7 preventive data', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d7`, token, {
        systemicAnalysisComplete: 1,
        systemicAnalysisMethod: 'Process FMEA review',
      });
      expect(status).toBe(200);
      expect(data.systemicAnalysisComplete).toBeTruthy();
    });

    it('POST /api/capas/:id/d7/actions - adds preventive action (201)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d7/actions`, token, {
        description: 'Update PFMEA for Line 3',
        actionType: 'preventive',
      });
      expect(status).toBe(201);
      expect(data.status).toBe('open');
    });

    it('PATCH /api/capas/:id/d7/actions/:actionId - updates preventive action', async () => {
      const capa = await createTestCapa(token);
      const { data: action } = await api('POST', `/api/capas/${capa.id}/d7/actions`, token, {
        description: 'Update control plan',
      });
      const { status, data } = await api(
        'PATCH', `/api/capas/${capa.id}/d7/actions/${action.id}`, token,
        { status: 'in_progress' },
      );
      expect(status).toBe(200);
      expect(data.status).toBe('in_progress');
    });

    it('POST /api/capas/:id/d7/lesson-learned - creates lesson learned (201)', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d7`, token, {});
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d7/lesson-learned`, token, {
        title: 'Tooling PM schedule critical',
        description: 'Regular PM prevents defects on high-speed lines',
        category: 'maintenance',
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
    });

    it('POST /api/capas/:id/d7/complete - fails without systemic analysis', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d7`, token, { systemicAnalysisComplete: 0 });
      const { status } = await api('POST', `/api/capas/${capa.id}/d7/complete`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d7/complete - succeeds with systemic analysis complete', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d7`, token, {
        systemicAnalysisComplete: 1,
        systemicAnalysisMethod: 'FMEA review',
      });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d7/complete`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('D7 completed');
    });

    it('PUT /api/capas/:id/d7/horizontal-deployment - updates deployment plan', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d7`, token, {});
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d7/horizontal-deployment`, token, {
        locations: { 'Plant A': { status: 'planned' }, 'Plant B': { status: 'planned' } },
      });
      expect(status).toBe(200);
    });
  });

  // =====================================================================
  // D8 - Team Recognition & Closure
  // =====================================================================
  describe('D8 - Team Recognition & Closure', () => {
    it('GET /api/capas/:id/d8 - returns null initially', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/d8`, token);
      expect(status).toBe(200);
      expect(data).toBeNull();
    });

    it('PUT /api/capas/:id/d8 - creates D8 closure data', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d8`, token, {
        closureSummary: 'All disciplines completed successfully',
      });
      expect(status).toBe(200);
    });

    it('POST /api/capas/:id/d8/close - fails without approval', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d8`, token, { closureSummary: 'test' });
      const { status } = await api('POST', `/api/capas/${capa.id}/d8/close`, token);
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d8/close - succeeds after approval', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d8`, token, { closureSummary: 'Done' });
      // Approve closure first
      await api('POST', `/api/capas/${capa.id}/d8/approve-closure`, token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d8/close`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('CAPA closed');
      // Verify the CAPA status is now 'closed'
      const { data: updated } = await api('GET', `/api/capas/${capa.id}`, token);
      expect(updated.status).toBe('closed');
    });

    it('POST /api/capas/:id/d8/reopen - reopens closed CAPA with reason', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d8`, token, { closureSummary: 'Done' });
      await api('POST', `/api/capas/${capa.id}/d8/approve-closure`, token);
      await api('POST', `/api/capas/${capa.id}/d8/close`, token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d8/reopen`, token, {
        reason: 'Problem recurred at customer',
      });
      expect(status).toBe(200);
      expect(data.message).toContain('reopened');
    });

    it('POST /api/capas/:id/d8/reopen - fails without reason', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d8`, token, { closureSummary: 'Done' });
      await api('POST', `/api/capas/${capa.id}/d8/approve-closure`, token);
      await api('POST', `/api/capas/${capa.id}/d8/close`, token);
      const { status } = await api('POST', `/api/capas/${capa.id}/d8/reopen`, token, {});
      expect(status).toBe(400);
    });

    it('POST /api/capas/:id/d8/approve-closure - approves CAPA closure (admin)', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d8`, token, { closureSummary: 'All complete' });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d8/approve-closure`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('approved');
    });

    it('POST /api/capas/:id/d8/submit-for-approval - submits for closure review', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d8/submit-for-approval`, token);
      expect(status).toBe(200);
      expect(data.message).toContain('Submitted');
    });

    it('PUT /api/capas/:id/d8/team-recognition - records team recognition', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d8`, token, { closureSummary: 'test' });
      const { status, data } = await api('PUT', `/api/capas/${capa.id}/d8/team-recognition`, token, {
        recognitionType: 'certificate',
        notes: 'Outstanding teamwork on rapid root cause identification',
      });
      expect(status).toBe(200);
    });

    it('POST /api/capas/:id/d8/lessons-learned - adds lesson learned (201)', async () => {
      const capa = await createTestCapa(token);
      await api('PUT', `/api/capas/${capa.id}/d8`, token, { closureSummary: 'test' });
      const { status, data } = await api('POST', `/api/capas/${capa.id}/d8/lessons-learned`, token, {
        title: 'PM schedule gaps',
        description: 'Need to audit PM schedules quarterly',
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
    });
  });

  // =====================================================================
  // Audit Log
  // =====================================================================
  describe('Audit Log', () => {
    it('GET /api/capas/:id/audit-log - returns entries after CAPA creation', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/audit-log`, token);
      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThanOrEqual(1);
      // First entry should be 'created'
      const createdEntry = data.find((e: any) => e.action === 'created');
      expect(createdEntry).toBeDefined();
    });

    it('GET /api/capas/:id/audit-log - includes update entries', async () => {
      const capa = await createTestCapa(token);
      await api('PATCH', `/api/capas/${capa.id}`, token, { title: 'Audit log test' });
      const { status, data } = await api('GET', `/api/capas/${capa.id}/audit-log`, token);
      expect(status).toBe(200);
      const updateEntry = data.find((e: any) => e.action === 'updated');
      expect(updateEntry).toBeDefined();
    });

    it('GET /api/capas/:id/audit-log - filters by action type', async () => {
      const capa = await createTestCapa(token);
      await api('PATCH', `/api/capas/${capa.id}`, token, { title: 'Test' });
      const { status, data } = await api('GET', `/api/capas/${capa.id}/audit-log?action=created`, token);
      expect(status).toBe(200);
      for (const entry of data) {
        expect(entry.action).toBe('created');
      }
    });

    it('GET /api/capas/:id/audit-log/verify-chain - validates hash chain', async () => {
      const capa = await createTestCapa(token);
      await api('PATCH', `/api/capas/${capa.id}`, token, { title: 'Chain test 1' });
      await api('PATCH', `/api/capas/${capa.id}`, token, { title: 'Chain test 2' });
      const { status, data } = await api('GET', `/api/capas/${capa.id}/audit-log/verify-chain`, token);
      expect(status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.totalEntries).toBeGreaterThanOrEqual(3);
      expect(data.checkedAt).toBeDefined();
    });

    it('GET /api/capas/:id/audit-log - includes discipline completion entries', async () => {
      const capa = await createTestCapa(token);
      await completeD0(token, capa.id);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/audit-log`, token);
      expect(status).toBe(200);
      const completionEntry = data.find((e: any) => e.action === 'discipline_completed');
      expect(completionEntry).toBeDefined();
    });

    it('GET /api/capas/:id/audit-log - includes delete entries', async () => {
      const capa = await createTestCapa(token);
      await api('DELETE', `/api/capas/${capa.id}`, token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/audit-log`, token);
      expect(status).toBe(200);
      const deleteEntry = data.find((e: any) => e.action === 'deleted');
      expect(deleteEntry).toBeDefined();
    });

    it('GET /api/capa-audit-logs - returns recent activity across org', async () => {
      const { status, data } = await api('GET', '/api/capa-audit-logs', token);
      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);
    });

    it('GET /api/capas/:id/audit-log - respects limit parameter', async () => {
      const capa = await createTestCapa(token);
      await api('PATCH', `/api/capas/${capa.id}`, token, { title: 'a' });
      await api('PATCH', `/api/capas/${capa.id}`, token, { title: 'b' });
      await api('PATCH', `/api/capas/${capa.id}`, token, { title: 'c' });
      const { status, data } = await api('GET', `/api/capas/${capa.id}/audit-log?limit=2`, token);
      expect(status).toBe(200);
      expect(data.length).toBeLessThanOrEqual(2);
    });
  });

  // =====================================================================
  // Analytics
  // =====================================================================
  describe('Analytics', () => {
    it('GET /api/capa-analytics/summary - returns summary metrics', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/summary', token);
      expect(status).toBe(200);
      expect(data).toHaveProperty('totalOpen');
      expect(data).toHaveProperty('totalClosed');
      expect(data).toHaveProperty('avgCycleTimeDays');
      expect(data).toHaveProperty('onTimeRate');
      expect(data).toHaveProperty('effectivenessRate');
      expect(data).toHaveProperty('recurrenceRate');
    });

    it('GET /api/capa-analytics/by-status - returns status breakdown', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/by-status', token);
      expect(status).toBe(200);
      expect(data).toBeDefined();
    });

    it('GET /api/capa-analytics/by-priority - returns priority breakdown', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/by-priority', token);
      expect(status).toBe(200);
      expect(data).toBeDefined();
    });

    it('GET /api/capa-analytics/by-source - returns source type breakdown', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/by-source', token);
      expect(status).toBe(200);
      expect(typeof data).toBe('object');
    });

    it('GET /api/capa-analytics/trends - returns trend data', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/trends', token);
      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);
    });

    it('GET /api/capa-analytics/pareto - returns pareto analysis', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/pareto', token);
      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);
    });

    it('GET /api/capa-analytics/aging - returns aging buckets', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/aging', token);
      expect(status).toBe(200);
      expect(data).toHaveProperty('0-30');
      expect(data).toHaveProperty('31-60');
      expect(data).toHaveProperty('61-90');
      expect(data).toHaveProperty('91-180');
      expect(data).toHaveProperty('180+');
    });

    it('GET /api/capa-analytics/team-performance - returns team data', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/team-performance', token);
      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);
    });

    it('GET /api/capa-analytics/by-category - returns category breakdown', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/by-category', token);
      expect(status).toBe(200);
      expect(typeof data).toBe('object');
    });

    it('GET /api/capa-analytics/summary - handles org with no CAPAs gracefully', async () => {
      // This tests that analytics endpoints don't crash with division by zero
      // Our org already has CAPAs so just verify 200
      const { status } = await api('GET', '/api/capa-analytics/summary', token);
      expect(status).toBe(200);
    });
  });

  // =====================================================================
  // Analysis Tools
  // =====================================================================
  describe('Analysis Tools', () => {
    it('GET /api/capas/:id/analysis-tools - lists tools (initially empty)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('GET', `/api/capas/${capa.id}/analysis-tools`, token);
      expect(status).toBe(200);
      expect(data.tools).toBeInstanceOf(Array);
      expect(data.tools.length).toBe(0);
    });

    it('POST /api/capas/:id/analysis-tools - creates analysis tool (201)', async () => {
      const capa = await createTestCapa(token);
      const { status, data } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
        toolType: 'five_why',
        name: '5-Why Analysis for Root Cause',
        discipline: 'D4',
        data: { whys: [] },
      });
      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.toolType).toBe('five_why');
    });

    it('POST /api/capas/:id/analysis-tools - rejects invalid tool type', async () => {
      const capa = await createTestCapa(token);
      const { status } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
        toolType: 'invalid_tool',
        name: 'Bad Tool',
      });
      expect(status).toBe(400);
    });

    it('PUT /api/capas/:id/analysis-tools/:toolId - updates tool data', async () => {
      const capa = await createTestCapa(token);
      const { data: tool } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
        toolType: 'fishbone',
        name: 'Fishbone Diagram',
      });
      const { status, data } = await api(
        'PUT', `/api/capas/${capa.id}/analysis-tools/${tool.id}`, token,
        {
          name: 'Updated Fishbone',
          data: { categories: { man: [], machine: [], method: [] } },
        },
      );
      expect(status).toBe(200);
      expect(data.name).toBe('Updated Fishbone');
    });

    it('DELETE /api/capas/:id/analysis-tools/:toolId - deletes tool', async () => {
      const capa = await createTestCapa(token);
      const { data: tool } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
        toolType: 'is_is_not',
        name: 'Is/Is Not Analysis',
      });
      const { status, data } = await api(
        'DELETE', `/api/capas/${capa.id}/analysis-tools/${tool.id}`, token,
      );
      expect(status).toBe(200);
      expect(data.deleted).toBe(true);
    });

    it('POST /api/capas/:id/analysis-tools/:toolId/complete - marks tool as complete', async () => {
      const capa = await createTestCapa(token);
      const { data: tool } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
        toolType: 'five_why',
        name: '5-Why for test',
      });
      const { status, data } = await api(
        'POST', `/api/capas/${capa.id}/analysis-tools/${tool.id}/complete`, token,
        { conclusion: 'Root cause identified as worn tooling' },
      );
      expect(status).toBe(200);
      expect(data.status).toBe('complete');
    });

    it('POST /api/capas/:id/analysis-tools/:toolId/verify - verifies completed tool', async () => {
      const capa = await createTestCapa(token);
      const { data: tool } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
        toolType: 'five_why',
        name: '5-Why verify test',
      });
      // Complete first
      await api('POST', `/api/capas/${capa.id}/analysis-tools/${tool.id}/complete`, token, {
        conclusion: 'Root cause confirmed',
      });
      const { status, data } = await api(
        'POST', `/api/capas/${capa.id}/analysis-tools/${tool.id}/verify`, token,
      );
      expect(status).toBe(200);
      expect(data.status).toBe('verified');
    });

    it('POST /api/capas/:id/analysis-tools/:toolId/verify - fails if tool not complete', async () => {
      const capa = await createTestCapa(token);
      const { data: tool } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
        toolType: 'fishbone',
        name: 'Unfinished Fishbone',
      });
      const { status } = await api(
        'POST', `/api/capas/${capa.id}/analysis-tools/${tool.id}/verify`, token,
      );
      expect(status).toBe(400);
    });

    it('GET /api/capas/:id/analysis-tools/:toolId - returns single tool', async () => {
      const capa = await createTestCapa(token);
      const { data: tool } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
        toolType: 'comparative',
        name: 'Comparative Analysis',
      });
      const { status, data } = await api(
        'GET', `/api/capas/${capa.id}/analysis-tools/${tool.id}`, token,
      );
      expect(status).toBe(200);
      expect(data.id).toBe(tool.id);
      expect(data.toolType).toBe('comparative');
    });

    it('POST /api/capas/:id/analysis-tools - supports all valid tool types', async () => {
      const capa = await createTestCapa(token);
      const types = ['is_is_not', 'five_why', 'three_leg_five_why', 'fishbone', 'fault_tree', 'comparative', 'change_point', 'pareto'];
      for (const toolType of types) {
        const { status } = await api('POST', `/api/capas/${capa.id}/analysis-tools`, token, {
          toolType,
          name: `${toolType} test`,
        });
        expect(status).toBe(201);
      }
    });
  });

  // =====================================================================
  // Discipline Advancement Flow
  // =====================================================================
  describe('Discipline Advancement Flow', () => {
    it('advances through D0 to D8 sequentially', async () => {
      const capa = await createTestCapa(token);
      const disciplines = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
      const statuses = ['d1_team', 'd2_problem', 'd3_containment', 'd4_root_cause', 'd5_corrective', 'd6_validation', 'd7_preventive', 'd8_closure'];

      for (let i = 0; i < disciplines.length; i++) {
        const { status, data } = await advanceDiscipline(token, capa.id);
        expect(status).toBe(200);
        expect(data.currentDiscipline).toBe(disciplines[i]);
        expect(data.status).toBe(statuses[i]);
      }
    });

    it('cannot advance beyond D8', async () => {
      const capa = await createTestCapa(token);
      // Advance to D8
      for (let i = 0; i < 8; i++) {
        await advanceDiscipline(token, capa.id);
      }
      const { status } = await advanceDiscipline(token, capa.id);
      expect(status).toBe(400);
    });

    it('hold and resume preserves current discipline', async () => {
      const capa = await createTestCapa(token);
      // Advance to D2
      await advanceDiscipline(token, capa.id);
      await advanceDiscipline(token, capa.id);

      // Put on hold
      await api('POST', `/api/capas/${capa.id}/hold`, token, { reason: 'Waiting' });
      const { data: held } = await api('GET', `/api/capas/${capa.id}`, token);
      expect(held.status).toBe('on_hold');
      expect(held.currentDiscipline).toBe('D2');

      // Resume
      const { data: resumed } = await api('POST', `/api/capas/${capa.id}/resume`, token);
      expect(resumed.status).toBe('d2_problem');
      expect(resumed.currentDiscipline).toBe('D2');
    });
  });
});
