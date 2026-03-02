import { Router } from "express";
import { notificationService } from "../services/notification-service";
import { getErrorMessage } from "./_helpers";

const router = Router();

router.get('/notifications', async (req, res) => {
  const userId = 'current-user'; // Placeholder: integrate with auth provider when available
  const { unreadOnly, limit, type } = req.query;

  try {
    const items = await notificationService.getForUser(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit as string) : 50,
      type: type as any,
    });

    res.json(items);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get unread count
router.get('/notifications/unread-count', async (req, res) => {
  const userId = 'current-user';

  try {
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await notificationService.markAsRead(parseInt(id));
    res.json(updated);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Mark all as read
router.post('/notifications/read-all', async (req, res) => {
  const userId = 'current-user';

  try {
    await notificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Delete notification
router.delete('/notifications/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await notificationService.delete(parseInt(id));
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Delete all read notifications
router.delete('/notifications/read', async (req, res) => {
  const userId = 'current-user';

  try {
    await notificationService.deleteAllRead(userId);
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Trigger notification generation (would be called by cron job in production)
router.post('/notifications/generate', async (req, res) => {
  try {
    const overdueCount = await notificationService.generateOverdueActionNotifications();
    const dueSoonCount = await notificationService.generateDueSoonNotifications(3);

    res.json({
      generated: {
        overdue: overdueCount,
        dueSoon: dueSoonCount,
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

export { router as notificationsRouter };
