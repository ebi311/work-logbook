import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// DATABASE_URLを環境変数から取得
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(databaseUrl);

async function migrate() {
  try {
    console.log('🚀 Applying custom migrations...');
    
    // customフォルダ内のSQLファイルを実行
    const customDir = join(__dirname, '../drizzle/custom');
    const files = readdirSync(customDir).filter(f => f.endsWith('.sql')).sort();
    
    for (const file of files) {
      console.log(`📄 Executing ${file}...`);
      const filePath = join(customDir, file);
      const sqlContent = readFileSync(filePath, 'utf-8');
      
      // ファイル全体を1つのステートメントとして実行（関数定義内のセミコロンに対応）
      await sql.unsafe(sqlContent);
    }
    
    console.log('✅ Custom migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
