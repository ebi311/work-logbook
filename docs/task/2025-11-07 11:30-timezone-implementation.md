# タスク: タイムゾーン対応の実装

## 概要

日次時間集計においてタイムゾーンのズレが発生していた問題を解決し、ユーザーのタイムゾーンに基づいた正確な時間集計を実現する。

## 背景

- **問題**: 本日の時間の合計を取得する際、タイムゾーンのズレが発生
- **原因**: サーバー側でUTCベースの日付計算を行っており、クライアントのタイムゾーンを考慮していなかった
- **影響**: ユーザーの現地時間で「今日」の定義がずれ、集計結果が不正確になる

## 要件

1. クライアント側のタイムゾーンをサーバー側で認識する
2. セッション情報としてタイムゾーンを保持する
3. セッションが利用できない場合のフォールバック機能(Cookie)を実装する
4. デフォルトタイムゾーンは `Asia/Tokyo` とする
5. 日付計算には Day.js を使用する
6. タイムゾーン処理を一元管理するユーティリティを作成する

## 実装内容

### 1. タイムゾーンユーティリティ関数

**ファイル**: `src/lib/utils/timezone.ts`

```typescript
export const DEFAULT_TIMEZONE = 'Asia/Tokyo';

export const getTodayStart = (timezone: string = DEFAULT_TIMEZONE): string
export const getDateStart = (date: Date | string, timezone: string = DEFAULT_TIMEZONE): string
export const getMonthStart = (timezone: string = DEFAULT_TIMEZONE): string
export const formatInTimezone = (date: Date | string, timezone: string = DEFAULT_TIMEZONE, format?: string): string
```

**機能**:

- `getTodayStart`: 指定タイムゾーンでの今日の開始時刻(00:00:00)を取得
- `getDateStart`: 指定日の開始時刻を取得
- `getMonthStart`: 指定タイムゾーンでの今月の開始時刻を取得
- `formatInTimezone`: 指定タイムゾーンで日時をフォーマット

**テスト**: 14のテストケースを作成、全て合格

- JST、UTC、ESTでの動作確認
- タイムゾーン差による日付のズレを検証
- Date オブジェクトと文字列の両方に対応

### 2. セッション型の拡張

**ファイル**: `src/lib/server/auth/session.ts`

```typescript
export type SessionRecord = {
	userId: string;
	createdAt: string;
	timezone?: string; // 追加
};
```

**変更点**:

- `SessionRecord` に `timezone` フィールドを追加
- `validateSession` の戻り値に `timezone` を追加
- `updateSessionTimezone` 関数を追加してセッションのタイムゾーンを更新

**ファイル**: `src/app.d.ts`

```typescript
interface Locals {
	user?: {
		id: string;
		githubId: string;
		githubUsername: string;
		isActive: boolean;
		timezone: string; // 追加
	};
}
```

### 3. タイムゾーンAPIエンドポイント

**ファイル**: `src/routes/api/timezone/+server.ts`

```typescript
export const POST: RequestHandler = async ({ request, cookies }) => {
	// クライアントから送信されたタイムゾーンを受信
	const { timezone } = await request.json();

	// セッションを更新
	await updateSessionTimezone(sessionId, timezone);

	// Cookieにも保存(フォールバック用)
	cookies.set('timezone', timezone, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365,
	});
};
```

**機能**:

- POSTリクエストでタイムゾーンを受信
- セッション(Redis)に保存
- Cookie(1年間有効)にも保存してフォールバック

### 4. クライアント側のタイムゾーン検出

**ファイル**: `src/routes/+layout.svelte`

```typescript
const sendTimezone = async () => {
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	await fetch('/api/timezone', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ timezone }),
	});
};

onMount(() => {
	sendTimezone();
	// ...
});
```

**機能**:

- ページマウント時にブラウザのタイムゾーンを検出
- `/api/timezone` に送信して保存

### 5. hooks.server.ts の修正

**ファイル**: `src/hooks.server.ts`

```typescript
// タイムゾーンを取得: セッション → Cookie → デフォルト
const timezone = sessionResult.timezone || cookies.get('timezone') || DEFAULT_TIMEZONE;

locals.user = {
	...user,
	timezone,
};
```

**優先順位**:

1. セッション(Redis)から取得
2. Cookieから取得(セッションが利用できない場合)
3. デフォルト(`Asia/Tokyo`)を使用

### 6. 既存コードの更新

**ファイル**: `src/routes/+page.server.ts`

```typescript
// 変更前
const todayStartISO = dayjs().tz(defaultTimezone).startOf('day').toISOString();

// 変更後
const todayStartISO = getTodayStart(timezone);
```

```typescript
// fetchListData関数のシグネチャを変更
const fetchListData = async (
  userId: string,
  timezone: string, // 追加
  normalized: { ... }
) => { ... }

// 呼び出し側
const listData = fetchListData(userId, locals.user.timezone, normalized);
```

**変更点**:

- Day.js の直接使用を削除
- ユーティリティ関数を使用
- ユーザーのタイムゾーンを関数に渡す

## データフロー

```
[クライアント]
  ↓ (1) Intl.DateTimeFormat().resolvedOptions().timeZone
  ↓
[/api/timezone POST]
  ↓ (2) セッション(Redis)に保存
  ↓ (3) Cookie に保存(フォールバック)
  ↓
[hooks.server.ts]
  ↓ (4) セッション → Cookie → デフォルト の順で取得
  ↓
[locals.user.timezone]
  ↓ (5) 各ハンドラで使用
  ↓
[タイムゾーンユーティリティ]
  ↓ (6) Day.js で計算
  ↓
[正確な時間集計]
```

## テスト結果

### ユニットテスト

- タイムゾーンユーティリティ: 14/14 合格
- hooks.server.ts: 8/8 合格
- +page.server.ts: 11/11 合格
- 全体: 625/625 合格

### テストケース例

```typescript
describe('getTodayStart', () => {
	it('JST で今日の開始時刻を取得', () => {
		const result = getTodayStart('Asia/Tokyo');
		expect(result).toBe('2025-11-07T00:00:00+09:00');
	});

	it('UTC で今日の開始時刻を取得', () => {
		const result = getTodayStart('UTC');
		expect(result).toBe('2025-11-07T00:00:00Z');
	});
});
```

## コミット履歴

1. **a3e48dc**: タイムゾーンユーティリティ関数を実装
   - timezone.ts, timezone.spec.ts を作成
   - 14のテストケースを追加

2. **9d0d24f**: タイムゾーンのセッション管理とクライアント検出を実装
   - SessionRecord に timezone フィールドを追加
   - /api/timezone APIエンドポイントを作成
   - hooks.server.ts でタイムゾーンを取得
   - +layout.svelte でクライアントのタイムゾーンを検出

3. **c662d9b**: 既存コードでタイムゾーンユーティリティを使用
   - +page.server.ts で getTodayStart を使用
   - fetchListData に timezone パラメータを追加
   - Day.js の直接使用を削除

## 使用技術

- **Day.js**: v1.11.18 (timezone, utc プラグイン使用)
- **Redis**: セッションストレージ(Heroku Key-Value Store)
- **Cookie**: フォールバック用の永続化
- **Vitest**: テストフレームワーク

## 今後の拡張

### 対応済み

- ✅ クライアントのタイムゾーン自動検出
- ✅ セッションとCookieでの永続化
- ✅ 日次時間集計でのタイムゾーン考慮
- ✅ タイムゾーン処理の一元管理

### 今後の改善案

- [ ] ユーザー設定でタイムゾーンを手動変更できるようにする
- [ ] タイムゾーン変更時の通知機能
- [ ] 月次集計でもタイムゾーンを考慮する
- [ ] 作業履歴表示でユーザーのタイムゾーンでフォーマット
- [ ] タイムゾーンごとの統計情報(国際チーム向け)

## 注意事項

1. **Day.js の format() の挙動**
   - UTC の場合: `2025-11-07T00:00:00Z` (末尾が `Z`)
   - その他: `2025-11-07T00:00:00+09:00` (オフセット付き)
   - `.toISOString()` は常にUTCに変換するため使用しない

2. **日付文字列の解釈**
   - `'2025-10-15'` のような文字列はローカルタイムゾーンとして解釈される
   - タイムゾーン間で変換すると前日/翌日になる可能性がある
   - 常に ISO8601 形式(タイムゾーン付き)を使用すること

3. **セッションとCookieの同期**
   - セッションが優先される
   - Cookie はフォールバック用(SSR時など)
   - セッション失効時でも Cookie から復元可能

## 参考リンク

- [Day.js Timezone Plugin](https://day.js.org/docs/en/plugin/timezone)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
