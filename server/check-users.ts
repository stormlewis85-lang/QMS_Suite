import 'dotenv/config';
import { db } from './db';
import { user } from '@shared/schema';

async function check() {
  const users = await db.select({ email: user.email, role: user.role, status: user.status }).from(user);
  console.log('Users:', JSON.stringify(users, null, 2));
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
