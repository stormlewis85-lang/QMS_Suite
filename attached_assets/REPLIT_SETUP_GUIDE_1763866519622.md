# PFMEA Suite - Replit Setup Guide

## Why Your Build Failed on Replit

Your current PFMEA app uses:
- Docker (not supported on Replit)
- Turborepo monorepo (complex for Replit)
- Local PostgreSQL (needs Replit-specific config)

## Replit-Compatible Architecture

### Quick Start Option: Simplified Next.js App

**Structure:**
```
pfmea-app/
├── .replit              # Replit configuration
├── replit.nix           # Nix environment setup
├── package.json         # Dependencies
├── next.config.js       # Next.js config
├── tsconfig.json        # TypeScript config
├── drizzle.config.ts    # Database config
├── .env.local           # Environment variables
├── src/
│   ├── app/             # Next.js 14 app directory
│   ├── server/          # tRPC routers & services
│   ├── db/              # Drizzle schema & migrations
│   └── lib/             # Shared utilities & AP calculator
```

### Step-by-Step Setup

#### 1. Create New Replit Project
```bash
# On Replit, create a new Node.js project
# Then run these commands:

npm create next-app@latest pfmea-app -- --typescript --tailwind --app --no-src-dir
cd pfmea-app
```

#### 2. Install Dependencies
```bash
npm install @trpc/server@next @trpc/client@next @trpc/react-query@next
npm install @tanstack/react-query@latest
npm install drizzle-orm postgres
npm install -D drizzle-kit
npm install zod
npm install date-fns
```

#### 3. Configure Replit Database

**In Replit Dashboard:**
1. Go to Tools → Database
2. Add PostgreSQL database
3. Copy connection string

**Create `.env.local`:**
```env
DATABASE_URL="postgresql://..."
NODE_ENV="development"
```

#### 4. Create Replit Configuration

**.replit:**
```toml
run = "npm run dev"
entrypoint = "src/app/page.tsx"

[nix]
channel = "stable-22_11"

[deployment]
run = "npm run start"
deploymentTarget = "cloudrun"

[[ports]]
localPort = 3000
externalPort = 80
```

**replit.nix:**
```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.typescript-language-server
    pkgs.nodePackages.prettier
    pkgs.postgresql
  ];
}
```

#### 5. Update package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

## Key Differences from Your Docker Setup

| Feature | Docker Setup | Replit Setup |
|---------|-------------|--------------|
| Database | Local PostgreSQL container | Replit PostgreSQL service |
| Monorepo | Turborepo with packages | Single Next.js app |
| API | Separate packages/api | src/server directory |
| Database | packages/db | src/db directory |
| Hot Reload | Docker volumes | Native Replit |

## Migration Checklist

- [ ] Create Replit project
- [ ] Setup PostgreSQL on Replit
- [ ] Copy schema from packages/db → src/db
- [ ] Copy API routers from packages/api → src/server
- [ ] Copy shared utilities → src/lib
- [ ] Update import paths
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Test build process

## Common Replit Issues & Fixes

### Issue: Build Hangs
**Fix:** Reduce bundle size, use dynamic imports
```typescript
const Component = dynamic(() => import('./Component'), {
  loading: () => <div>Loading...</div>,
})
```

### Issue: Database Connection Timeout
**Fix:** Use connection pooling
```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
})
```

### Issue: Memory Limits
**Fix:** Optimize dependencies, use production build
```bash
NODE_ENV=production npm run build
```

## Next Steps

Would you like me to:
1. Create the complete Replit-compatible codebase structure?
2. Convert your existing monorepo to work on Replit?
3. Build a specific component (PFMEA generator, Control Plan, etc.)?

Let me know and I'll generate the complete working code!
