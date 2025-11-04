# PWA対応のための機能要件調査レポート

## 概要

本アプリケーションをPWA（Progressive Web App）に対応させるために必要な機能と実装手順について調査しました。

## PWAとは

Progressive Web Appは、ウェブ技術で構築されながら、ネイティブアプリのような体験を提供できるアプリケーションです。以下の特徴があります：

- **インストール可能**: ホーム画面に追加して、ネイティブアプリのように起動できる
- **オフライン動作**: Service Workerを使って、ネットワークがなくても動作する
- **プッシュ通知**: ユーザーにリアルタイムで通知を送れる
- **高速**: キャッシュにより、高速な読み込みを実現
- **セキュア**: HTTPS必須

## PWA対応に必要な機能

### 1. 必須機能（Core PWA Features）

#### 1.1 Web App Manifest

**目的**: アプリのメタデータを定義し、ホーム画面へのインストールを可能にする

**必要な作業**:

- `static/manifest.json` ファイルの作成
- アプリ名、アイコン、テーマカラー、表示モードなどの設定
- `app.html` に manifest へのリンクを追加

**manifest.json の主要項目**:

```json
{
	"name": "Work Logbook",
	"short_name": "Worklog",
	"description": "フリーランスITエンジニアのための作業記録アプリ",
	"start_url": "/",
	"display": "standalone",
	"background_color": "#ffffff",
	"theme_color": "#3b82f6",
	"icons": [
		{
			"src": "/icon-192.png",
			"sizes": "192x192",
			"type": "image/png"
		},
		{
			"src": "/icon-512.png",
			"sizes": "512x512",
			"type": "image/png"
		}
	]
}
```

#### 1.2 Service Worker

**目的**: オフライン動作とキャッシュ戦略を実現する

**必要な作業**:

- Service Worker ファイルの作成（`static/service-worker.js`）
- キャッシュ戦略の実装
- Service Worker の登録処理

**実装方法の選択肢**:

1. **手動実装**: Service Worker を自分で実装
   - メリット: 完全なコントロールが可能
   - デメリット: 実装が複雑

2. **Vite Plugin PWA 使用**: `vite-plugin-pwa` を使用
   - メリット: 自動生成、簡単な設定
   - デメリット: カスタマイズに制限がある場合も

3. **SvelteKit Service Worker**: SvelteKitの組み込み機能を使用
   - メリット: フレームワークとの統合が良い
   - デメリット: 現状は実験的機能

**推奨**: `vite-plugin-pwa` の使用（Workbox ベース）

#### 1.3 アプリアイコン

**目的**: ホーム画面やスプラッシュスクリーンで表示される

**必要なアイコンサイズ**:

- 192x192px（最小）
- 512x512px（推奨）
- 任意で他のサイズも追加可能（72, 96, 128, 144, 152, 384）

**形式**: PNG（透過可能）

**配置場所**: `static/` ディレクトリ

#### 1.4 HTTPS対応

**目的**: PWAの必須要件（Service Workerの動作に必要）

**現状**: Vercelにデプロイ済みのため、本番環境では対応済み

**開発環境**: localhostは例外として許可されるため、開発時は問題なし

### 2. オフライン機能（Offline Support）

本アプリの要件（CONCEPT.md の O-003）に含まれる機能です。

#### 2.1 キャッシュ戦略

**静的アセットのキャッシュ**:

- HTML, CSS, JavaScript
- 画像、フォント
- 戦略: Cache First（キャッシュ優先）

**APIリクエストのキャッシュ**:

- GET リクエスト: Network First（ネットワーク優先、フォールバックでキャッシュ）
- POST/PUT/DELETE: Network Only（同期が必要）

#### 2.2 オフライン時のデータ同期

**Background Sync API の使用**:

- オフライン時の作業記録を一時保存
- オンライン復帰時に自動同期

**必要な実装**:

1. IndexedDBまたはLocalStorageでのオフラインデータ保存
2. Background Sync APIの登録
3. 同期処理の実装
4. 競合解決の仕組み（オプション）

#### 2.3 オフライン表示の改善

- オフライン時の通知表示
- 未同期データの表示（バッジなど）
- オフラインページの提供

### 3. ユーザー体験向上（Enhanced UX）

#### 3.1 インストールプロンプト

**目的**: ユーザーにアプリのインストールを促す

**実装**:

- `beforeinstallprompt` イベントの捕捉
- カスタムインストールボタンの表示
- 適切なタイミングでのプロンプト表示

#### 3.2 アプリ更新通知

**目的**: 新しいバージョンが利用可能な時にユーザーに通知

**実装**:

- Service Worker の更新検出
- 更新通知UIの表示
- 更新の適用（ページリロード）

#### 3.3 スプラッシュスクリーン

**目的**: アプリ起動時のネイティブアプリらしい体験

**実装**:

- manifestに `background_color` と `theme_color` を設定
- アイコンが自動的にスプラッシュスクリーンとして表示される

### 4. パフォーマンス最適化

#### 4.1 プリキャッシュ

**目的**: 初回訪問後、すぐにオフライン動作を可能にする

**対象**:

- アプリシェル（HTML, CSS, JS）
- 重要な画像・アイコン
- フォント

#### 4.2 ランタイムキャッシュ

**目的**: 使用頻度の高いデータを動的にキャッシュ

**対象**:

- API レスポンス
- 画像
- その他動的コンテンツ

### 5. オプション機能（将来的な拡張）

#### 5.1 プッシュ通知

**用途**:

- 作業開始のリマインダー
- 休憩タイマーの通知（O-004との連携）
- 同期完了の通知

**必要な作業**:

- Push API の実装
- 通知パーミッションの取得
- バックエンドでの通知送信機能

#### 5.2 バッジAPI

**用途**:

- 未同期のデータ数を表示
- 新しいタスクの数を表示

#### 5.3 ショートカット

**用途**:

- 長押しメニューから「作業開始」などの操作を直接実行

**manifest.json への追加**:

```json
{
	"shortcuts": [
		{
			"name": "作業開始",
			"short_name": "開始",
			"description": "新しい作業を開始",
			"url": "/?action=start",
			"icons": [{ "src": "/icons/start.png", "sizes": "96x96" }]
		}
	]
}
```

## 実装の優先順位

### フェーズ1: 基本PWA対応（必須）

1. ✅ Web App Manifest の作成
2. ✅ アプリアイコンの作成・配置
3. ✅ Service Worker の基本実装（vite-plugin-pwa使用）
4. ✅ 静的アセットのキャッシュ

**完了条件**:

- ホーム画面に追加可能
- オフラインで基本的なUIが表示される

### フェーズ2: オフライン機能（重要）

1. ✅ オフライン時のデータ保存（IndexedDB）
2. ✅ Background Sync APIの実装
3. ✅ オフライン状態の通知
4. ✅ データ同期処理

**完了条件**:

- オフラインで作業記録の作成・編集が可能
- オンライン復帰時に自動同期される

### フェーズ3: UX向上（推奨）

1. ✅ インストールプロンプト
2. ✅ アプリ更新通知
3. ✅ キャッシュ戦略の最適化

### フェーズ4: 追加機能（オプション）

1. ⬜ プッシュ通知
2. ⬜ バッジAPI
3. ⬜ ショートカット機能

## 技術的な考慮事項

### 使用するライブラリ・ツール

1. **vite-plugin-pwa**: Service Workerの自動生成とWorkboxの統合

   ```bash
   pnpm add -D vite-plugin-pwa
   ```

2. **workbox-window**: クライアント側のService Worker管理
   - vite-plugin-pwaに含まれる

3. **idb**: IndexedDBのラッパー（オプション、より簡単なAPI）
   ```bash
   pnpm add idb
   ```

### SvelteKitとの統合

**adapter-vercel との互換性**:

- Vercel は PWA を完全にサポート
- Service Worker は問題なく動作
- エッジ関数との併用も可能

**SSRとの関係**:

- Service Worker はクライアント側で動作
- SSR で生成されたHTMLもキャッシュ可能
- API ルートのキャッシュ戦略を適切に設定

### データ同期の設計

**同期戦略の選択肢**:

1. **楽観的更新（Optimistic Update）**
   - UIを即座に更新
   - バックグラウンドで同期
   - 失敗時はロールバック

2. **悲観的更新（Pessimistic Update）**
   - 同期完了後にUIを更新
   - より確実だが、オフライン時は使用不可

**推奨**: 楽観的更新 + ローカルストレージでの一時保存

**競合解決**:

- タイムスタンプベースの解決（Last Write Wins）
- 本アプリは単一ユーザーなので、競合は少ない
- 将来的には CRDTs などの導入も検討可能

## セキュリティ考慮事項

1. **HTTPSの必須化**: すでに対応済み（Vercel）
2. **Service Workerのスコープ**: ルートスコープで適切に制限
3. **キャッシュされたデータ**: 個人情報を含むため、適切な有効期限を設定
4. **同期時の認証**: 認証トークンの適切な管理

## パフォーマンス指標

PWA対応後の目標値:

- **Lighthouse PWA Score**: 100/100
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.0s
- **オフライン対応**: すべての主要機能が動作

## 参考リソース

- [MDN: Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Vite Plugin PWA](https://vite-pwa-org.netlify.app/)
- [SvelteKit Service Workers](https://kit.svelte.dev/docs/service-workers)
- [Workbox](https://developer.chrome.com/docs/workbox/)

## まとめ

PWA対応には以下の4つの主要な機能が必要です：

### 必須機能（フェーズ1）

1. **Web App Manifest**: アプリのメタデータ定義とインストール機能
2. **Service Worker**: オフライン動作とキャッシュ管理
3. **アプリアイコン**: 各サイズのアイコン画像
4. **HTTPS**: セキュアな通信（Vercelで対応済み）

### 重要機能（フェーズ2）

5. **オフラインデータ保存**: IndexedDB/LocalStorageを使用
6. **Background Sync**: オンライン復帰時の自動同期
7. **オフライン通知**: ユーザーへの状態通知

### 推奨機能（フェーズ3）

8. **インストールプロンプト**: ユーザーフレンドリーなインストール誘導
9. **更新通知**: 新バージョンの通知

### オプション機能（フェーズ4）

10. **プッシュ通知**: タイマーやリマインダー
11. **バッジAPI**: 未同期データの表示
12. **ショートカット**: 長押しメニューからの直接操作

実装の推奨順序はフェーズ1→フェーズ2→フェーズ3→フェーズ4です。
