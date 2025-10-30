import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// .env.local を読み込む
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true,
});
