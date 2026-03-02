import { db } from '../db';
import { notifications, actionItem, pfmea, pfmeaRow, part } from '@shared/schema';
import { eq, and, lt, inArray, desc, isNull, or, gt } from 'drizzle-orm';

export type NotificationType = 
  | 'action_overdue'
  | 'action_assigned'
  | 'action_due_soon'
  | 'signature_required'
  | 'document_approved'
  | 'document_effective'
  | 'review_findings'
  | 'high_ap_added';

interface CreateNotificationInput {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

export class NotificationService {
  
  // ========== CREATE NOTIFICATIONS ==========
  
  async create(input: CreateNotificationInput) {
    const [notification] = await db.insert(notifications).values({
      orgId: input.orgId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      priority: input.priority || 'normal',
      expiresAt: input.expiresAt,
    }).returning();
    
    return notification;
  }
  
  async createBulk(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return [];
    
    const created = await db.insert(notifications).values(
      inputs.map(input => ({
        orgId: input.orgId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        priority: input.priority || 'normal',
        expiresAt: input.expiresAt,
      }))
    ).returning();
    
    return created;
  }
  
  // ========== READ NOTIFICATIONS ==========
  
  async getForUser(userId: string, options: { 
    unreadOnly?: boolean; 
    limit?: number;
    type?: NotificationType;
  } = {}) {
    const { unreadOnly = false, limit = 50, type } = options;
    
    const conditions = [eq(notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }
    
    if (type) {
      conditions.push(eq(notifications.type, type));
    }
    
    // Exclude expired notifications
    conditions.push(
      or(
        isNull(notifications.expiresAt),
        gt(notifications.expiresAt, new Date())
      )!
    );
    
    const results = await db.select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    
    return results;
  }
  
  async getUnreadCount(userId: string): Promise<number> {
    const results = await db.select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false),
          or(
            isNull(notifications.expiresAt),
            gt(notifications.expiresAt, new Date())
          )
        )
      );
    
    return results.length;
  }
  
  // ========== UPDATE NOTIFICATIONS ==========
  
  async markAsRead(notificationId: number) {
    const [updated] = await db.update(notifications)
      .set({ 
        read: true, 
        readAt: new Date() 
      })
      .where(eq(notifications.id, notificationId))
      .returning();
    
    return updated;
  }
  
  async markAllAsRead(userId: string) {
    await db.update(notifications)
      .set({ 
        read: true, 
        readAt: new Date() 
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )
      );
  }
  
  async delete(notificationId: number) {
    await db.delete(notifications)
      .where(eq(notifications.id, notificationId));
  }
  
  async deleteAllRead(userId: string) {
    await db.delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, true)
        )
      );
  }
  
  // ========== AUTOMATED NOTIFICATION GENERATORS ==========
  
  async generateOverdueActionNotifications() {
    const now = new Date();
    
    // Find overdue actions
    const overdueActions = await db.select({
      action: actionItem,
      pfmeaRowData: pfmeaRow,
      pfmeaData: pfmea,
      partData: part,
    })
    .from(actionItem)
    .innerJoin(pfmeaRow, eq(actionItem.pfmeaRowId, pfmeaRow.id))
    .innerJoin(pfmea, eq(pfmeaRow.pfmeaId, pfmea.id))
    .innerJoin(part, eq(pfmea.partId, part.id))
    .where(
      and(
        inArray(actionItem.status, ['open', 'in_progress']),
        lt(actionItem.targetDate, now)
      )
    );
    
    const notificationsToCreate: CreateNotificationInput[] = [];
    
    for (const item of overdueActions) {
      // Check if we already sent a notification for this action today
      const existingToday = await db.select()
        .from(notifications)
        .where(
          and(
            eq(notifications.entityType, 'action_item'),
            eq(notifications.entityId, item.action.id),
            eq(notifications.type, 'action_overdue'),
            gt(notifications.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))
          )
        )
        .limit(1);
      
      if (existingToday.length === 0) {
        notificationsToCreate.push({
          orgId: item.pfmeaData.orgId,
          userId: item.action.responsiblePerson,
          type: 'action_overdue',
          title: 'Action Item Overdue',
          message: `Action "${item.action.description.substring(0, 50)}..." for ${item.partData.partNumber} is overdue.`,
          entityType: 'action_item',
          entityId: item.action.id,
          priority: 'high',
        });
      }
    }
    
    if (notificationsToCreate.length > 0) {
      await this.createBulk(notificationsToCreate);
    }
    
    return notificationsToCreate.length;
  }
  
  async generateDueSoonNotifications(daysAhead: number = 3) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    // Find actions due soon
    const dueSoonActions = await db.select({
      action: actionItem,
      pfmeaRowData: pfmeaRow,
      pfmeaData: pfmea,
      partData: part,
    })
    .from(actionItem)
    .innerJoin(pfmeaRow, eq(actionItem.pfmeaRowId, pfmeaRow.id))
    .innerJoin(pfmea, eq(pfmeaRow.pfmeaId, pfmea.id))
    .innerJoin(part, eq(pfmea.partId, part.id))
    .where(
      and(
        inArray(actionItem.status, ['open', 'in_progress']),
        gt(actionItem.targetDate, now),
        lt(actionItem.targetDate, futureDate)
      )
    );
    
    const notificationsToCreate: CreateNotificationInput[] = [];
    
    for (const item of dueSoonActions) {
      const daysUntilDue = Math.ceil(
        (new Date(item.action.targetDate!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      // Only notify once when it becomes "due soon"
      const existingNotif = await db.select()
        .from(notifications)
        .where(
          and(
            eq(notifications.entityType, 'action_item'),
            eq(notifications.entityId, item.action.id),
            eq(notifications.type, 'action_due_soon')
          )
        )
        .limit(1);
      
      if (existingNotif.length === 0) {
        notificationsToCreate.push({
          orgId: item.pfmeaData.orgId,
          userId: item.action.responsiblePerson,
          type: 'action_due_soon',
          title: 'Action Item Due Soon',
          message: `Action "${item.action.description.substring(0, 50)}..." is due in ${daysUntilDue} day(s).`,
          entityType: 'action_item',
          entityId: item.action.id,
          priority: 'normal',
        });
      }
    }
    
    if (notificationsToCreate.length > 0) {
      await this.createBulk(notificationsToCreate);
    }
    
    return notificationsToCreate.length;
  }
  
  async notifySignatureRequired(
    orgId: string,
    documentType: 'pfmea' | 'control_plan',
    documentId: number,
    requiredRoles: string[]
  ) {
    const notificationsToCreate: CreateNotificationInput[] = requiredRoles.map(role => ({
      orgId,
      userId: role,
      type: 'signature_required' as NotificationType,
      title: 'Signature Required',
      message: `A ${documentType.toUpperCase()} document requires your signature as ${role}.`,
      entityType: documentType,
      entityId: documentId,
      priority: 'high' as const,
    }));
    
    await this.createBulk(notificationsToCreate);
  }
  
  async notifyDocumentApproved(
    orgId: string,
    documentType: 'pfmea' | 'control_plan',
    documentId: number,
    ownerId: string
  ) {
    await this.create({
      orgId,
      userId: ownerId,
      type: 'document_approved',
      title: 'Document Approved',
      message: `Your ${documentType.toUpperCase()} has been approved and is now effective.`,
      entityType: documentType,
      entityId: documentId,
      priority: 'normal',
    });
  }
  
  async notifyHighAPAdded(
    orgId: string,
    pfmeaId: number,
    failureMode: string,
    ownerId: string
  ) {
    await this.create({
      orgId,
      userId: ownerId,
      type: 'high_ap_added',
      title: 'High AP Failure Mode Added',
      message: `A high AP failure mode "${failureMode.substring(0, 40)}..." was added and requires action.`,
      entityType: 'pfmea',
      entityId: pfmeaId,
      priority: 'high',
    });
  }
  
  async notifyReviewFindings(
    orgId: string,
    documentType: 'pfmea' | 'control_plan',
    documentId: number,
    ownerId: string,
    errorCount: number,
    warningCount: number
  ) {
    if (errorCount === 0 && warningCount === 0) return;

    await this.create({
      orgId,
      userId: ownerId,
      type: 'review_findings',
      title: 'Auto-Review Findings',
      message: `Auto-review found ${errorCount} error(s) and ${warningCount} warning(s) in your ${documentType.toUpperCase()}.`,
      entityType: documentType,
      entityId: documentId,
      priority: errorCount > 0 ? 'high' : 'normal',
    });
  }
}

export const notificationService = new NotificationService();
