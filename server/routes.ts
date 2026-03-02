import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { runAllSeeds } from "./seed";
import { requireAuth } from "./middleware/auth";
import { csrfProtection } from "./middleware/csrf";

// Route modules
import { authRouter } from "./routes/auth.routes";
import { importRouter } from "./routes/import.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { partsRouter } from "./routes/parts.routes";
import { processesRouter } from "./routes/processes.routes";
import { pfmeaRouter } from "./routes/pfmea.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { controlPlansRouter } from "./routes/control-plans.routes";
import { librariesRouter } from "./routes/libraries.routes";
import { autoReviewRouter } from "./routes/auto-review.routes";
import { changePackagesRouter } from "./routes/change-packages.routes";
import { documentsRouter } from "./routes/documents";
import { capaRouter } from "./routes/capa";

export async function registerRoutes(app: Express): Promise<Server> {
  // Run seeds on startup
  runAllSeeds().catch(console.error);

  // Add cookie parser middleware
  app.use(cookieParser());

  // CSRF protection on all API state-changing requests
  app.use('/api', csrfProtection);

  // Auth routes BEFORE global auth middleware (public endpoints)
  app.use('/api/auth', authRouter);

  // Global auth middleware — protects all non-auth API routes
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    return requireAuth(req, res, next);
  });

  // Authenticated route modules
  app.use('/api/import', importRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api', partsRouter);
  app.use('/api', processesRouter);
  app.use('/api', pfmeaRouter);
  app.use('/api', notificationsRouter);
  app.use('/api', controlPlansRouter);
  app.use('/api', librariesRouter);
  app.use('/api', autoReviewRouter);
  app.use('/api', changePackagesRouter);
  app.use('/api', documentsRouter);
  app.use('/api', capaRouter);

  // Catch-all: return 404 for any unmatched /api/* routes so the Vite SPA
  // handler doesn't swallow them with a 200 HTML response.
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Cleanup expired sessions every 15 minutes
  const SESSION_CLEANUP_INTERVAL = 15 * 60 * 1000;
  setInterval(async () => {
    try {
      const deleted = await storage.deleteExpiredSessions();
      if (deleted > 0) {
        console.log(`Session cleanup: removed ${deleted} expired sessions`);
      }
    } catch (error: unknown) {
      console.error("Session cleanup error:", error);
    }
  }, SESSION_CLEANUP_INTERVAL);

  const httpServer = createServer(app);
  return httpServer;
}
