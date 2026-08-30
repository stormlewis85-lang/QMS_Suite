import 'dotenv/config';
import { db } from './db';
import { user } from '@shared/schema';
import logger from './logger';

async function check() {
  const users = await db.select({ email: user.email, role: user.role, status: user.status }).from(user);
  logger.info({ users }, 'Users');
  process.exit(0);
}
check().catch(e => { logger.error({ err: e }, 'Check users failed'); process.exit(1); });
