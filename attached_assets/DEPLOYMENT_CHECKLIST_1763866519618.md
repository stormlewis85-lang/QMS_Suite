# PFMEA Suite - Replit Deployment Checklist

Use this checklist to ensure successful deployment on Replit.

## Pre-Deployment

### 1. Replit Project Setup
- [ ] Created new Replit project (Node.js)
- [ ] Uploaded all configuration files (.replit, replit.nix, package.json)
- [ ] Verified Node.js version >= 18

### 2. Database Configuration
- [ ] Created PostgreSQL database in Replit Tools
- [ ] Copied connection string
- [ ] Added DATABASE_URL to Secrets
- [ ] Tested connection with: `psql $DATABASE_URL -c "SELECT version();"`

### 3. Environment Variables
- [ ] DATABASE_URL (required)
- [ ] NODE_ENV (optional, defaults to 'development')
- [ ] NEXT_PUBLIC_APP_URL (optional)

### 4. File Structure
- [ ] All source files in src/ directory
- [ ] Database schema in src/db/schema/
- [ ] tRPC routers in src/server/routers/
- [ ] Services in src/server/services/
- [ ] App pages in src/app/

## Deployment Steps

### Phase 1: Initial Setup (5 minutes)
- [ ] Run `npm install`
- [ ] Verify no dependency errors
- [ ] Check package-lock.json created

### Phase 2: Database Setup (3 minutes)
- [ ] Run `npm run db:generate`
- [ ] Review generated migrations in drizzle/
- [ ] Run `npm run db:push`
- [ ] Verify tables created: `psql $DATABASE_URL -c "\dt"`

### Phase 3: Data Seeding (2 minutes)
- [ ] Run `npm run db:seed`
- [ ] Verify data inserted: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM customer_parts;"`
- [ ] Check for seed errors

### Phase 4: Application Build (5 minutes)
- [ ] Run `npm run build`
- [ ] Watch for build errors
- [ ] Verify .next/ directory created
- [ ] Check build output for warnings

### Phase 5: Start Server (1 minute)
- [ ] Run `npm run dev` (development) or `npm run start` (production)
- [ ] Verify server starts on port 3000
- [ ] Check console for errors

## Post-Deployment Verification

### Functional Tests
- [ ] Home page loads (/)
- [ ] Parts list loads (/parts)
- [ ] Process library loads (/processes)
- [ ] Can create new part
- [ ] Can generate PFMEA
- [ ] tRPC API responds (/api/trpc)

### Database Tests
- [ ] Run `npm run db:studio`
- [ ] Verify all tables present
- [ ] Check seed data loaded correctly
- [ ] Test relationships (foreign keys)

### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] No memory leaks (monitor with `top`)
- [ ] Build completes in < 2 minutes

### Type Safety Tests
- [ ] Run `npm run type-check`
- [ ] No TypeScript errors
- [ ] tRPC types working
- [ ] Zod validation working

## Common Issues & Solutions

### Issue: npm install fails
**Symptoms:** Dependency resolution errors
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Database connection fails
**Symptoms:** "ECONNREFUSED" or timeout errors
**Solution:**
1. Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
2. Check database is running: Tools → Database
3. Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

### Issue: Build hangs or times out
**Symptoms:** Build process stops responding
**Solution:**
1. Reduce bundle size - check for large dependencies
2. Use dynamic imports for heavy components
3. Increase timeout: `next.config.js → webpack.optimization`

### Issue: Port 3000 already in use
**Symptoms:** "EADDRINUSE: address already in use"
**Solution:**
```bash
killall node
npm run dev
```

### Issue: TypeScript errors during build
**Symptoms:** Type errors prevent compilation
**Solution:**
1. Run `npm run type-check` to see all errors
2. Fix type issues in reported files
3. Regenerate types: `npx tRPC generate`

### Issue: Missing environment variables
**Symptoms:** "DATABASE_URL is not defined"
**Solution:**
1. Go to Tools → Secrets
2. Add missing variables
3. Restart the Repl

### Issue: Drizzle schema mismatch
**Symptoms:** "Column does not exist" or schema errors
**Solution:**
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## Performance Optimization

### Before Going to Production
- [ ] Enable production mode: `NODE_ENV=production`
- [ ] Run production build: `npm run build`
- [ ] Use `npm run start` instead of `npm run dev`
- [ ] Enable caching in Next.js config
- [ ] Optimize images (use next/image)
- [ ] Configure CDN for static assets

### Database Optimization
- [ ] Add indexes to frequently queried columns
- [ ] Use connection pooling (already configured)
- [ ] Set up read replicas if needed
- [ ] Monitor query performance with Drizzle Studio

### Monitoring Setup
- [ ] Set up error logging
- [ ] Configure uptime monitoring
- [ ] Track API response times
- [ ] Monitor database connection pool

## Security Checklist

### Environment
- [ ] All secrets in Replit Secrets (not in code)
- [ ] DATABASE_URL not committed to git
- [ ] No hardcoded credentials
- [ ] HTTPS enabled (automatic on Replit)

### Application
- [ ] Input validation with Zod
- [ ] SQL injection prevention (Drizzle ORM handles this)
- [ ] XSS prevention (React handles this)
- [ ] CSRF protection enabled

### Database
- [ ] Database user has minimal required permissions
- [ ] Sensitive data encrypted
- [ ] Regular backups configured
- [ ] Connection string stored securely

## Rollback Plan

If deployment fails:

### 1. Stop the application
```bash
# Press Ctrl+C in terminal
```

### 2. Check recent changes
```bash
git log -5
git diff HEAD~1
```

### 3. Revert database if needed
```bash
# Drizzle doesn't have automatic rollbacks
# Manually restore from backup or re-run setup
```

### 4. Restore previous working state
```bash
npm ci  # Install exact versions from lock file
rm -rf .next
npm run build
```

### 5. Document the issue
- Note what failed
- Capture error messages
- Record steps taken
- Plan fix for next deployment

## Success Criteria

Deployment is successful when:
- ✅ All tests pass
- ✅ Application accessible at Replit URL
- ✅ Database queries working
- ✅ No console errors
- ✅ tRPC endpoints responding
- ✅ Type safety maintained
- ✅ Performance acceptable (<3s page load)

## Next Steps After Deployment

1. **Test Core Features**
   - Create a test part
   - Generate a test PFMEA
   - Review auto-review results

2. **Set Up Monitoring**
   - Configure error tracking
   - Set up uptime alerts
   - Monitor performance metrics

3. **User Acceptance Testing**
   - Share URL with stakeholders
   - Gather feedback
   - Document enhancement requests

4. **Plan Next Sprint**
   - Review "What's Next" from PFMEA App Context
   - Prioritize features
   - Schedule development time

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Replit URL:** _______________
**Status:** ⬜ Success ⬜ Failed ⬜ Partial
**Notes:**
