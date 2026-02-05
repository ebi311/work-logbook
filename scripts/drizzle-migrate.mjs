import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local を読み込む
config({ path: join(__dirname, '../.env.local') });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// ローカル開発環境用のneonConfig設定
if (process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true') {
	console.log('🔧 Configuring neonConfig for local development...');
	neonConfig.fetchEndpoint = (host) => {
		const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
		return `${protocol}://neon-proxy:${port}/sql`;
	};
	const connectionStringUrl = new URL(process.env.DATABASE_URL);
	neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'db.localtest.me';
	neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? 'neon-proxy:4444/v2' : `${host}/v2`);
	neonConfig.pipelineConnect = false;
}

async function runMigrations() {
	try {
		console.log('🚀 Starting database migrations...');

		const sql = neon(process.env.DATABASE_URL);
		const db = drizzle(sql);

		const migrationsFolder = join(__dirname, '../drizzle');
		console.log(`📂 Migrations folder: ${migrationsFolder}`);

		await migrate(db, { migrationsFolder });

		console.log('✅ All migrations completed successfully!');
		process.exit(0);
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	}
}

runMigrations();
