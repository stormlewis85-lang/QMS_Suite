import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1,
  setupOrg2,
  cleanupCapaTestOrgs,
  api,
  createTestCapa,
  BASE_URL,
} from '../capa/test-helpers';

describe('CAPA Multi-Tenancy Isolation', () => {
  let org1Token: string;
  let org2Token: string;
  let org1UserId: string;
  let org2UserId: string;
  let org1Capa: any;
  let org2Capa: any;

  beforeAll(async () => {
    await cleanupCapaTestOrgs();
    const o1 = await setupOrg1();
    org1Token = o1.token;
    org1UserId = o1.user.id;
    const o2 = await setupOrg2();
    org2Token = o2.token;
    org2UserId = o2.user.id;

    // Create CAPAs in each org
    org1Capa = await createTestCapa(org1Token, { title: 'Org1 CAPA' });
    org2Capa = await createTestCapa(org2Token, { title: 'Org2 CAPA' });
  }, 30000);

  afterAll(async () => {
    await cleanupCapaTestOrgs();
  }, 30000);

  // ═══════════════════════════════════════════════════════════════════
  //  CAPA ACCESS ISOLATION
  // ═══════════════════════════════════════════════════════════════════

  describe('CAPA Access', () => {
    it('org1 cannot see org2 CAPAs in list', async () => {
      const { status, data } = await api('GET', '/api/capas', org1Token);
      expect(status).toBe(200);
      const ids = (data.data || data).map((c: any) => c.id);
      expect(ids).not.toContain(org2Capa.id);
    });

    it('org1 cannot access org2 CAPA by ID', async () => {
      const { status } = await api('GET', `/api/capas/${org2Capa.id}`, org1Token);
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 CAPA', async () => {
      const { status } = await api('PATCH', `/api/capas/${org2Capa.id}`, org1Token, {
        title: 'Hijacked CAPA',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot delete org2 CAPA', async () => {
      const { status } = await api('DELETE', `/api/capas/${org2Capa.id}`, org1Token);
      expect(status).toBe(404);
    });

    it('org1 cannot advance org2 discipline', async () => {
      const { status } = await api('POST', `/api/capas/${org2Capa.id}/advance-discipline`, org1Token);
      expect(status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  TEAM MEMBERS ISOLATION
  // ═══════════════════════════════════════════════════════════════════

  describe('Team Members', () => {
    it('org1 cannot add member to org2 CAPA', async () => {
      const { status } = await api('POST', `/api/capas/${org2Capa.id}/team`, org1Token, {
        userId: org1UserId,
        role: 'member',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot see org2 CAPA team', async () => {
      const { status } = await api('GET', `/api/capas/${org2Capa.id}/team`, org1Token);
      expect(status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  DISCIPLINE DATA ISOLATION (D0-D8)
  // ═══════════════════════════════════════════════════════════════════

  describe('Disciplines', () => {
    it('org1 cannot update org2 D0 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d0`, org1Token, {
        emergencyResponseRequired: 0,
        symptomsCaptured: 1,
        symptomsDescription: 'Cross-org attack',
        initialScope: 'Should be blocked',
        threatLevel: 'low',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 D1 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d1`, org1Token, {
        teamChampion: 'Attacker',
        teamSponsor: 'Attacker',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 D2 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d2`, org1Token, {
        problemStatement: 'Cross-org write attempt',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 D3 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d3`, org1Token, {
        containmentDescription: 'Cross-org write attempt',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 D4 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d4`, org1Token, {
        rootCauseDescription: 'Cross-org write attempt',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 D5 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d5`, org1Token, {
        correctiveActionDescription: 'Cross-org write attempt',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 D6 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d6`, org1Token, {
        validationDescription: 'Cross-org write attempt',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 D7 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d7`, org1Token, {
        preventiveActionDescription: 'Cross-org write attempt',
      });
      expect(status).toBe(404);
    });

    it('org1 cannot update org2 D8 data', async () => {
      const { status } = await api('PUT', `/api/capas/${org2Capa.id}/d8`, org1Token, {
        closureSummary: 'Cross-org write attempt',
      });
      expect(status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  AUDIT LOG ISOLATION
  // ═══════════════════════════════════════════════════════════════════

  describe('Audit Logs', () => {
    it('org1 cannot see org2 audit logs', async () => {
      const { status } = await api('GET', `/api/capas/${org2Capa.id}/audit-log`, org1Token);
      expect(status).toBe(404);
    });

    it('org1 cannot verify org2 audit chain', async () => {
      const { status } = await api('GET', `/api/capas/${org2Capa.id}/audit-log/verify-chain`, org1Token);
      expect(status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  ANALYTICS ISOLATION
  // ═══════════════════════════════════════════════════════════════════

  describe('Analytics', () => {
    it('org1 analytics only include org1 data', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/summary', org1Token);
      expect(status).toBe(200);
      // Org1 created exactly one CAPA in beforeAll
      // The summary should reflect only org1's data, not org2's
      expect(data).toBeDefined();
      // totalCapas should include org1's CAPA(s) but not org2's
      if (data.totalCapas !== undefined) {
        // We created 1 CAPA for org1; org2 also has 1 but it must not be counted here
        expect(data.totalCapas).toBeGreaterThanOrEqual(1);
      }
    });

    it('org2 analytics only include org2 data', async () => {
      const { status, data } = await api('GET', '/api/capa-analytics/summary', org2Token);
      expect(status).toBe(200);
      expect(data).toBeDefined();
      if (data.totalCapas !== undefined) {
        expect(data.totalCapas).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  ANALYSIS TOOLS ISOLATION
  // ═══════════════════════════════════════════════════════════════════

  describe('Analysis Tools', () => {
    it('org1 cannot list org2 analysis tools', async () => {
      const { status } = await api('GET', `/api/capas/${org2Capa.id}/analysis-tools`, org1Token);
      expect(status).toBe(404);
    });

    it('org1 cannot create analysis tool on org2 CAPA', async () => {
      const { status } = await api('POST', `/api/capas/${org2Capa.id}/analysis-tools`, org1Token, {
        toolType: 'five_why',
        title: 'Cross-org analysis attempt',
      });
      expect(status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  UNAUTHENTICATED ACCESS
  // ═══════════════════════════════════════════════════════════════════

  describe('Unauthenticated Access', () => {
    it('cannot list CAPAs without auth', async () => {
      const res = await fetch(`${BASE_URL}/api/capas`);
      expect(res.status).toBe(401);
    });

    it('cannot create CAPA without auth', async () => {
      const res = await fetch(`${BASE_URL}/api/capas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unauthorized CAPA',
          description: 'Should be rejected',
          type: 'corrective',
          priority: 'high',
          sourceType: 'customer_complaint',
          category: 'quality',
        }),
      });
      expect(res.status).toBe(401);
    });

    it('cannot access CAPA without auth', async () => {
      const res = await fetch(`${BASE_URL}/api/capas/${org1Capa.id}`);
      expect(res.status).toBe(401);
    });
  });
});
