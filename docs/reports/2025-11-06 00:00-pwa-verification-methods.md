# Android で PWA として認識されているか確認する方法

## 作成日: 2025-11-06

## 概要

本アプリケーションが Android で PWA（Progressive Web App）として正しく認識されているかを確認するための方法をまとめます。

## 確認方法

### 1. Chrome DevTools による確認（開発環境）

デスクトップのChromeブラウザから最も詳細な情報を確認できます。

#### 手順:

1. アプリケーションにアクセス
2. DevTools を開く（F12 または右クリック→検証）
3. **Application** タブを選択
4. 以下の項目を確認：

##### a) Manifest の確認

- サイドバーの **Manifest** をクリック
- マニフェストの内容が表示される
- 警告やエラーがないか確認
- **Install app** ボタンが表示される → インストール可能 ✅

確認項目：

- `name`, `short_name`: アプリ名が正しいか
- `icons`: 必要なサイズのアイコンが登録されているか（192x192, 512x512）
- `display`: "standalone" または "fullscreen" になっているか
- `start_url`: 正しいURLか
- `theme_color`, `background_color`: 色が設定されているか

##### b) Service Worker の確認

- サイドバーの **Service Workers** をクリック
- Service Worker が登録されているか確認
- Status が "activated and is running" になっているか

確認項目：

- Service Worker の登録状態
- Scope（適用範囲）
- Update on reload（開発時）

##### c) Storage / Cache の確認

- **Cache Storage** をクリック
- キャッシュされたリソースを確認
- オフライン対応のための重要なリソースがキャッシュされているか

### 2. Android Chrome での実機確認

実際の Android デバイスで確認する方法です。

#### 手順:

1. Android の Chrome でアプリにアクセス
2. 右上のメニュー（⋮）を開く
3. 以下のいずれかが表示されるか確認：
   - 「**アプリをインストール**」
   - 「**ホーム画面に追加**」

**結果の見方**:

- 「アプリをインストール」が表示 → PWA として認識 ✅
- 「ホーム画面に追加」のみ → ブックマークとして認識（PWA要件未達） ⚠️

#### インストール後の確認:

1. ホーム画面にアイコンが追加される
2. アイコンをタップして起動
3. 以下を確認：
   - ブラウザのURL バーが非表示になる（standalone モード）
   - アプリ名がタイトルバーに表示される
   - スプラッシュスクリーンが表示される（起動時）

### 3. Lighthouse による PWA 監査

Google の Lighthouse を使って PWA 要件を自動チェックします。

#### Chrome DevTools から実行:

1. DevTools を開く（F12）
2. **Lighthouse** タブを選択（または Performance Insights）
3. カテゴリーで **Progressive Web App** にチェック
4. **Analyze page load** をクリック

#### 確認項目:

必須項目（これらがすべてパスする必要がある）:

- ✅ Web app manifest を提供している
- ✅ Service Worker を登録している
- ✅ HTTPS でサービスされている
- ✅ リダイレクトが HTTP から HTTPS になっている
- ✅ レスポンシブデザイン（ビューポート設定）
- ✅ コンテンツが正しくサイズされている

推奨項目:

- ✅ カスタムスプラッシュスクリーン
- ✅ テーマカラーの設定
- ✅ アドレスバーの色がテーマカラーに一致
- ✅ オフライン時にカスタム200応答を提供

#### CLI から実行:

```bash
# Lighthouse をグローバルインストール（初回のみ）
npm install -g lighthouse

# PWA 監査を実行
lighthouse https://your-app-url.com --only-categories=pwa --view

# JSON形式で出力
lighthouse https://your-app-url.com --only-categories=pwa --output json --output-path ./pwa-report.json
```

### 4. Chrome Remote Debugging（Android実機のデバッグ）

Android 実機で動作している Chrome を PC から直接デバッグします。

#### 準備:

1. Android デバイスで開発者オプションを有効化
2. USB デバッグを ON にする
3. デバイスを PC に USB 接続

#### 手順:

1. PC の Chrome で `chrome://inspect` にアクセス
2. 接続された Android デバイスが表示される
3. アプリが開いているタブの **inspect** をクリック
4. DevTools が開き、実機の状態を確認できる
5. Application タブで Manifest, Service Worker を確認

**メリット**: 実機での動作を PC から詳細に確認できる

### 5. Web App Manifest Validator（オンラインツール）

マニフェストファイルの妥当性を確認するツールです。

#### 方法:

1. `https://manifest-validator.appspot.com/` にアクセス
2. アプリの URL または manifest.json の内容を入力
3. 検証結果を確認

**確認できる内容**:

- マニフェストの構文エラー
- 必須フィールドの欠落
- アイコンの問題
- 推奨される改善点

### 6. アドレスバーのインストールプロンプト確認

PWA として認識されていると、特定の条件下でインストールプロンプトが表示されます。

#### 確認方法（PC Chrome）:

1. アプリにアクセス
2. アドレスバーの右端を確認
3. インストールアイコン（⊕ または コンピュータアイコン）が表示される
4. クリックすると「インストール」ダイアログが表示される

#### 条件:

- Service Worker が登録されている
- Web App Manifest が有効
- HTTPS でサービスされている
- ユーザーがサイトと一定のエンゲージメントを持っている（複数回訪問など）

### 7. 本番環境での確認

開発環境と本番環境で動作が異なる場合があるため、デプロイ後も確認が必要です。

#### 確認項目:

1. **HTTPS の確認**
   - URL が `https://` で始まっているか
   - 証明書エラーがないか

2. **マニフェストの取得**

   ```bash
   curl -I https://your-app-url.com/manifest.webmanifest
   # または
   curl https://your-app-url.com/manifest.webmanifest
   ```

3. **Service Worker の登録**
   - DevTools で確認
   - Scope が正しいか（通常は `/`）

4. **アイコンファイルの存在確認**
   ```bash
   curl -I https://your-app-url.com/android-chrome-192x192.png
   curl -I https://your-app-url.com/android-chrome-512x512.png
   ```

## 本アプリの現在の設定

現在の `vite.config.ts` には以下の PWA 設定があります:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  includeAssets: [...],
  manifest: {
    name: 'Work Logbook',
    short_name: 'Worklog',
    description: 'フリーランスITエンジニアのための作業記録アプリ',
    theme_color: '#3b82f6',
    background_color: '#ffffff',
    display: 'standalone',
    ...
  }
})
```

## トラブルシューティング

### PWA として認識されない場合のチェックリスト

1. **HTTPS** - 本番環境が HTTPS か確認
2. **Manifest** - `/manifest.webmanifest` が存在し、アクセス可能か
3. **Service Worker** - 登録されているか、エラーがないか
4. **Icons** - 192x192 と 512x512 のアイコンが存在するか
5. **Display mode** - "standalone" または "fullscreen" に設定されているか
6. **Start URL** - 有効な URL か
7. **Name** - `name` または `short_name` が設定されているか

### よくある問題

1. **開発環境で動作しない**
   - 開発サーバーが HTTP の場合、localhost は例外として許可される
   - `http://localhost:*` は PWA として動作可能

2. **インストールプロンプトが表示されない**
   - 一度拒否すると一定期間表示されない
   - シークレットモードで試す
   - ブラウザのサイトデータをクリアして再試行

3. **Service Worker が更新されない**
   - `skipWaiting` の設定を確認
   - ハードリフレッシュ（Ctrl+Shift+R）
   - Application タブから手動で Unregister → 再登録

## まとめ

PWA として正しく認識されているかを確認するには:

1. **開発時**: Chrome DevTools の Application タブで確認（最優先）
2. **実機テスト**: Android Chrome でインストールオプションが表示されるか確認
3. **品質監査**: Lighthouse で PWA スコアを確認
4. **本番環境**: デプロイ後に実機とツールの両方で再確認

最も確実なのは、**実際の Android デバイス**で「アプリをインストール」オプションが表示されることを確認することです。
