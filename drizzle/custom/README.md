# カスタムマイグレーション

このディレクトリには、Drizzle Kit で自動生成できない手動マイグレーションファイルを配置します。

## 用途

- トリガー (TRIGGER)
- 関数 (FUNCTION)
- プロシージャ (PROCEDURE)
- カスタムインデックス（Drizzleで表現できないもの）
- その他のPostgreSQL固有の機能

## ファイル命名規則

```
<番号>_<説明>.sql
```

例: `0001_updated_at_trigger.sql`

## 実行方法

カスタムマイグレーションは以下のコマンドで実行します：

```bash
DATABASE_URL="postgres://root:mysecretpassword@db:5432/local" node scripts/migrate.mjs
```

または環境変数を `.env` に設定してある場合:

```bash
node scripts/migrate.mjs
```

## 注意事項

- このディレクトリ内のファイルは、`drizzle-kit generate` で上書きされません
- ファイルは番号順にソートされて実行されます
- 冪等性を保つため、`CREATE OR REPLACE` や `IF NOT EXISTS` を使用してください
- トリガーは `DROP TRIGGER IF EXISTS` してから作成することを推奨します

## 既存のカスタムマイグレーション

- `0001_updated_at_trigger.sql`: work_logs テーブルの updated_at 自動更新トリガー
