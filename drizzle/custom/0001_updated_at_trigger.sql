-- カスタムマイグレーション: updated_at 自動更新トリガー
-- このファイルは drizzle-kit generate で上書きされません

-- updated_at 自動更新関数を作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- work_logs テーブルに updated_at トリガーを作成
DROP TRIGGER IF EXISTS update_work_logs_updated_at ON work_logs;
CREATE TRIGGER update_work_logs_updated_at
BEFORE UPDATE ON work_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
