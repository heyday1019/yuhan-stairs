import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../drizzle/schema';

const globalForDb = globalThis as unknown as { __neonPool?: Pool };
const pool =
  globalForDb.__neonPool ??
  new Pool({ connectionString: process.env.DATABASE_URL! });
if (process.env.NODE_ENV !== 'production') globalForDb.__neonPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
