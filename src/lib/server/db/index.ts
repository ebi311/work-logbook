import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Neon HTTPクライアント（接続プーリング、HTTPベース、Vercel最適化済み）
const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export * from './workLogs';
