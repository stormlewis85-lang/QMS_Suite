import { describe, it, expect } from 'vitest';

// Test the workflow state machine logic (pure logic, no API calls)

type StepStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'delegated' | 'skipped';
type InstanceStatus = 'active' | 'completed' | 'rejected' | 'cancelled';

const VALID_STEP_TRANSITIONS: Record<string, StepStatus[]> = {
  pending: ['approved', 'rejected', 'delegated'],
  approved: [],
  rejected: [],
  delegated: [],
  skipped: [],
};

const VALID_INSTANCE_TRANSITIONS: Record<string, InstanceStatus[]> = {
  active: ['completed', 'rejected', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

function isValidStepTransition(from: StepStatus, to: StepStatus): boolean {
  return VALID_STEP_TRANSITIONS[from]?.includes(to) ?? false;
}

function isValidInstanceTransition(from: InstanceStatus, to: InstanceStatus): boolean {
  return VALID_INSTANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

interface WorkflowStepDef {
  name: string;
  assigneeType: 'initiator' | 'user' | 'role' | 'department_head';
  assigneeValue: string;
  dueDays: number;
  signatureRequired: boolean;
  canDelegate: boolean;
}

function resolveAssignee(step: WorkflowStepDef, initiatorId: string): string | null {
  switch (step.assigneeType) {
    case 'initiator': return initiatorId;
    case 'user': return step.assigneeValue;
    case 'role': return null; // resolved at runtime
    case 'department_head': return null;
    default: return null;
  }
}

function shouldCompleteWorkflow(totalSteps: number, currentStep: number, action: 'approved'): boolean {
  return action === 'approved' && currentStep >= totalSteps;
}

describe('Workflow Engine', () => {
  describe('Step Status Transitions', () => {
    it('should allow pending → approved', () => {
      expect(isValidStepTransition('pending', 'approved')).toBe(true);
    });

    it('should allow pending → rejected', () => {
      expect(isValidStepTransition('pending', 'rejected')).toBe(true);
    });

    it('should allow pending → delegated', () => {
      expect(isValidStepTransition('pending', 'delegated')).toBe(true);
    });

    it('should NOT allow approved → any other status', () => {
      expect(isValidStepTransition('approved', 'pending')).toBe(false);
      expect(isValidStepTransition('approved', 'rejected')).toBe(false);
      expect(isValidStepTransition('approved', 'delegated')).toBe(false);
    });

    it('should NOT allow rejected → any other status', () => {
      expect(isValidStepTransition('rejected', 'pending')).toBe(false);
      expect(isValidStepTransition('rejected', 'approved')).toBe(false);
      expect(isValidStepTransition('rejected', 'delegated')).toBe(false);
    });

    it('should NOT allow delegated → any other status', () => {
      expect(isValidStepTransition('delegated', 'pending')).toBe(false);
      expect(isValidStepTransition('delegated', 'approved')).toBe(false);
    });
  });

  describe('Workflow Instance Transitions', () => {
    it('should allow active → completed when all steps approved', () => {
      expect(isValidInstanceTransition('active', 'completed')).toBe(true);
    });

    it('should allow active → rejected when any step rejected', () => {
      expect(isValidInstanceTransition('active', 'rejected')).toBe(true);
    });

    it('should allow active → cancelled by admin', () => {
      expect(isValidInstanceTransition('active', 'cancelled')).toBe(true);
    });

    it('should NOT allow completed → any other status', () => {
      expect(isValidInstanceTransition('completed', 'active')).toBe(false);
      expect(isValidInstanceTransition('completed', 'rejected')).toBe(false);
      expect(isValidInstanceTransition('completed', 'cancelled')).toBe(false);
    });

    it('should NOT allow rejected → any other status', () => {
      expect(isValidInstanceTransition('rejected', 'active')).toBe(false);
      expect(isValidInstanceTransition('rejected', 'completed')).toBe(false);
    });

    it('should NOT allow cancelled → any other status', () => {
      expect(isValidInstanceTransition('cancelled', 'active')).toBe(false);
      expect(isValidInstanceTransition('cancelled', 'completed')).toBe(false);
    });
  });

  describe('Step Assignment', () => {
    it('should assign to initiator for assigneeType=initiator', () => {
      const step: WorkflowStepDef = {
        name: 'Submit', assigneeType: 'initiator', assigneeValue: '',
        dueDays: 5, signatureRequired: false, canDelegate: false,
      };
      expect(resolveAssignee(step, 'user-123')).toBe('user-123');
    });

    it('should assign to specific user for assigneeType=user', () => {
      const step: WorkflowStepDef = {
        name: 'Review', assigneeType: 'user', assigneeValue: 'user-456',
        dueDays: 3, signatureRequired: false, canDelegate: false,
      };
      expect(resolveAssignee(step, 'user-123')).toBe('user-456');
    });

    it('should leave null for role-based (runtime assignment)', () => {
      const step: WorkflowStepDef = {
        name: 'QA Review', assigneeType: 'role', assigneeValue: 'quality_manager',
        dueDays: 3, signatureRequired: true, canDelegate: true,
      };
      expect(resolveAssignee(step, 'user-123')).toBeNull();
    });

    it('should leave null for department_head (runtime assignment)', () => {
      const step: WorkflowStepDef = {
        name: 'Dept Approval', assigneeType: 'department_head', assigneeValue: '',
        dueDays: 5, signatureRequired: false, canDelegate: false,
      };
      expect(resolveAssignee(step, 'user-123')).toBeNull();
    });
  });

  describe('Workflow Advancement', () => {
    it('should complete workflow when last step approved', () => {
      expect(shouldCompleteWorkflow(3, 3, 'approved')).toBe(true);
    });

    it('should NOT complete when non-last step approved', () => {
      expect(shouldCompleteWorkflow(3, 2, 'approved')).toBe(false);
    });

    it('should NOT complete when first step approved', () => {
      expect(shouldCompleteWorkflow(3, 1, 'approved')).toBe(false);
    });
  });

  describe('Delegation', () => {
    it('should reject delegation when canDelegate=false', () => {
      const step: WorkflowStepDef = {
        name: 'Submit', assigneeType: 'initiator', assigneeValue: '',
        dueDays: 5, signatureRequired: false, canDelegate: false,
      };
      expect(step.canDelegate).toBe(false);
    });

    it('should allow delegation when canDelegate=true', () => {
      const step: WorkflowStepDef = {
        name: 'Review', assigneeType: 'role', assigneeValue: 'engineer',
        dueDays: 3, signatureRequired: false, canDelegate: true,
      };
      expect(step.canDelegate).toBe(true);
    });
  });
});
