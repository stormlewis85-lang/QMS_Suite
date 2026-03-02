import type { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection middleware.
 * On state-changing requests, validates one of:
 * 1. X-Requested-With: XMLHttpRequest (custom header — forms cannot set this)
 * 2. Content-Type starts with application/json (forms cannot send JSON)
 *
 * Both checks are valid CSRF defenses because cross-origin HTML forms
 * can only submit application/x-www-form-urlencoded, multipart/form-data,
 * or text/plain content types, and cannot set custom headers.
 *
 * Skips safe (read-only) HTTP methods.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Check for custom header (set by apiRequest and queryClient)
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    next();
    return;
  }

  // Check for JSON content type (forms cannot send this)
  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('application/json')) {
    next();
    return;
  }

  res.status(403).json({ error: 'CSRF validation failed' });
}
