-- NF-001: 既存のwork_logsデータとusersテーブルの統合
-- 既存のwork_logsテーブルから一意のuser_idを抽出し、usersテーブルにダミーユーザーを作成

DO $$
BEGIN
  -- 既存のwork_logsに存在するuser_idをusersテーブルに追加
  -- これは開発用の仮ユーザーIDを保持するため
  INSERT INTO users (id, github_id, github_username, is_active, created_at, updated_at)
  SELECT DISTINCT
    user_id,
    'temp_' || user_id::text AS github_id,
    'Temporary User' AS github_username,
    true AS is_active,
    NOW() AS created_at,
    NOW() AS updated_at
  FROM work_logs
  WHERE user_id IS NOT NULL
  ON CONFLICT (github_id) DO NOTHING;

  RAISE NOTICE 'Existing work_logs user_ids migrated to users table';
END $$;

-- users テーブルの updated_at 自動更新トリガーを追加
DROP TRIGGER IF EXISTS set_updated_at ON users;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
