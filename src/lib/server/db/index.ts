import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

if (process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true') {
	neonConfig.fetchEndpoint = (host) => {
		const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
		return `${protocol}://neon-proxy:${port}/sql`;
	};
	const connectionStringUrl = new URL(env.DATABASE_URL);
	neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'db.localtest.me';
	neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? 'neon-proxy:4444/v2' : `${host}/v2`);
	neonConfig.pipelineConnect = false;
}

// Neon HTTPクライアント（接続プーリング、HTTPベース、Vercel最適化済み）
const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export * from './workLogs';
