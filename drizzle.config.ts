import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { neonConfig } from '@neondatabase/serverless';

// .env.local を読み込む
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// ローカル開発環境用のneonConfig設定
if (process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true') {
	neonConfig.fetchEndpoint = (host) => {
		const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
		return `${protocol}://neon-proxy:${port}/sql`;
	};
	const connectionStringUrl = new URL(process.env.DATABASE_URL);
	neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'db.localtest.me';
	neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? 'neon-proxy:4444/v2' : `${host}/v2`);
	neonConfig.pipelineConnect = false;
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true,
});
