/**
 * Migration script for Core Platform MVP - Phase 1-2
 * Creates organization, user, session tables and adds org_id to existing tables.
 * Run with: npx tsx server/migrate-core-platform.ts
 */
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('Starting Core Platform migration...');

    // 1. Create enums (if not exist)
    console.log('  Creating enums...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role" AS ENUM('admin', 'quality_manager', 'engineer', 'viewer');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "user_status" AS ENUM('active', 'inactive', 'pending');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 2. Create organization table
    console.log('  Creating organization table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "organization" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "settings" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "organization_slug_unique" UNIQUE("slug")
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_idx" ON "organization" USING btree ("slug");
    `);

    // 3. Create user table
    console.log('  Creating user table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "org_id" uuid NOT NULL,
        "email" text NOT NULL,
        "password_hash" text NOT NULL,
        "first_name" text NOT NULL,
        "last_name" text NOT NULL,
        "role" "user_role" DEFAULT 'viewer' NOT NULL,
        "status" "user_status" DEFAULT 'active' NOT NULL,
        "last_login_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await client.query(`
      ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_org_id_organization_id_fk";
      ALTER TABLE "user" ADD CONSTRAINT "user_org_id_organization_id_fk"
        FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE cascade;
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "user_org_email_idx" ON "user" USING btree ("org_id", "email");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "user_org_idx" ON "user" USING btree ("org_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user" USING btree ("email");`);

    // 4. Create session table
    console.log('  Creating session table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "token" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "session_token_unique" UNIQUE("token")
      );
    `);
    await client.query(`
      ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk";
      ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade;
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "session_token_idx" ON "session" USING btree ("token");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "session_user_idx" ON "session" USING btree ("user_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "session_expires_idx" ON "session" USING btree ("expires_at");`);

    // 5. Create a default organization for existing data
    console.log('  Creating default organization for existing data...');
    const orgResult = await client.query(`
      INSERT INTO "organization" ("name", "slug", "settings")
      VALUES ('Default Organization', 'default-org', '{"defaultTimezone": "America/Detroit", "dateFormat": "MM/DD/YYYY"}')
      ON CONFLICT ("slug") DO UPDATE SET "name" = "organization"."name"
      RETURNING "id";
    `);
    const defaultOrgId = orgResult.rows[0].id;
    console.log(`  Default org ID: ${defaultOrgId}`);

    // 6. Add org_id to existing tables
    const tablesToUpdate: {
      table: string;
      uniqueConstraints: { old?: string; oldIsConstraint?: boolean; cols: string; newName?: string }[];
    }[] = [
      { table: 'process_def', uniqueConstraints: [{ old: 'process_def_name_rev_idx', cols: '"org_id", "name", "rev"' }] },
      { table: 'part', uniqueConstraints: [{ old: 'part_number_idx', cols: '"org_id", "part_number"' }] },
      { table: 'pfmea', uniqueConstraints: [] },
      { table: 'control_plan', uniqueConstraints: [] },
      { table: 'equipment_library', uniqueConstraints: [{ old: 'equipment_library_name_unique', oldIsConstraint: true, cols: '"org_id", "name"', newName: 'equipment_library_org_name_idx' }] },
      { table: 'gage_library', uniqueConstraints: [{ newName: 'gage_library_org_name_idx', cols: '"org_id", "name"' }] },
      { table: 'failure_modes_library', uniqueConstraints: [{ newName: 'failure_modes_org_name_idx', cols: '"org_id", "failure_mode"' }] },
      { table: 'controls_library', uniqueConstraints: [{ newName: 'controls_library_org_name_idx', cols: '"org_id", "name"' }] },
      { table: 'rating_scale', uniqueConstraints: [{ old: 'rating_scale_version_kind_idx', cols: '"org_id", "version", "kind"' }] },
    ];

    for (const { table, uniqueConstraints } of tablesToUpdate) {
      console.log(`  Adding org_id to ${table}...`);

      // Add column if not exists
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE "${table}" ADD COLUMN "org_id" uuid;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
      `);

      // Set default value for existing rows
      await client.query(`UPDATE "${table}" SET "org_id" = $1 WHERE "org_id" IS NULL`, [defaultOrgId]);

      // Make NOT NULL
      await client.query(`ALTER TABLE "${table}" ALTER COLUMN "org_id" SET NOT NULL`);

      // Add FK constraint
      await client.query(`
        ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_org_id_organization_id_fk";
        ALTER TABLE "${table}" ADD CONSTRAINT "${table}_org_id_organization_id_fk"
          FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE cascade;
      `);

      // Add org index
      await client.query(`CREATE INDEX IF NOT EXISTS "${table}_org_idx" ON "${table}" USING btree ("org_id");`);

      // Update/create unique constraints
      for (const uc of uniqueConstraints) {
        if (uc.old) {
          if (uc.oldIsConstraint) {
            // Drop table constraint (created by Drizzle .unique())
            await client.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${uc.old}";`);
          } else {
            // Drop standalone unique index (created by Drizzle uniqueIndex())
            await client.query(`DROP INDEX IF EXISTS "${uc.old}";`);
          }
        }
        // Deduplicate before creating unique index: keep the first row per group
        // First, find and remove duplicates (keeping the one with min(id))
        const joinConds = uc.cols.split(',').map(c => `a.${c.trim()} = b.${c.trim()}`).join(' AND ');
        // Get IDs of rows to delete (duplicates with higher ctid)
        const dupsResult = await client.query(`
          SELECT a.id FROM "${table}" a
          WHERE EXISTS (
            SELECT 1 FROM "${table}" b
            WHERE ${joinConds} AND b.ctid < a.ctid
          );
        `);
        if (dupsResult.rows.length > 0) {
          const dupIds = dupsResult.rows.map((r: any) => r.id);
          console.log(`    Deduplicating ${dupIds.length} duplicate(s) in ${table}...`);
          // Delete child FK references first, then the duplicates
          // Use a subquery approach that cascades through dependent tables
          for (const dupId of dupIds) {
            // Delete any calibration_link referencing this gage
            await client.query(`DELETE FROM "calibration_link" WHERE "gage_id" = $1`, [dupId]).catch(() => {});
            // Delete any control_pairings referencing failure modes or controls
            await client.query(`DELETE FROM "control_pairings" WHERE "failure_mode_id" = $1`, [dupId]).catch(() => {});
            await client.query(`DELETE FROM "control_pairings" WHERE "prevention_control_id" = $1 OR "detection_control_id" = $1`, [dupId]).catch(() => {});
            // Delete the duplicate
            await client.query(`DELETE FROM "${table}" WHERE "id" = $1`, [dupId]);
          }
        }
        const idxName = uc.newName || uc.old;
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "${idxName}" ON "${table}" USING btree (${uc.cols});`);
      }
    }

    await client.query('COMMIT');
    console.log('✓ Core Platform migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
