# アカウント添削会 予約管理アプリ

主催者が複数の日程枠を提示し、講師が空き枠を予約する形式のWebアプリケーションです。

## システム概要

このアプリケーションは、アカウント添削会の予約を効率的に管理するためのシステムです。

**想定される利用フロー:**
1. 主催者が複数の日程枠を登録
2. 講師が空いている日程枠を確認
3. 講師が希望の日程枠を予約
4. 定員に達した枠は自動的に満席表示

## 技術スタック

- **Next.js 16** (App Router)
- **TypeScript**
- **Supabase** (PostgreSQL)
- **Tailwind CSS**

## プロジェクト構造

```
claude-app/
├── app/
│   ├── globals.css          # グローバルスタイル
│   ├── layout.tsx           # ルートレイアウト
│   └── page.tsx             # トップページ
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Supabaseクライアント
│   │   └── schema.sql       # データベーススキーマ
│   └── types.ts             # TypeScript型定義
├── .env.local.example        # 環境変数のサンプル
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseの設定

#### 2.1 Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/) にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとAPIキー（anon key）を取得

#### 2.2 データベーススキーマの適用

1. Supabaseダッシュボードの「SQL Editor」を開く
2. `lib/supabase/schema.sql` の内容をコピー
3. SQLエディタに貼り付けて実行

これにより以下のテーブルが作成されます:
- `slots`: 日程枠
- `bookings`: 予約情報

スキーマには以下の機能が含まれています:
- 予約数の自動カウント（トリガー）
- 満席時の自動クローズ（トリガー）
- 定員超過防止チェック（トリガー）
- 終了時刻の自動計算（Generated Column）

### 3. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成:

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して、Supabaseの情報と管理者トークンを設定:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Admin Authentication
ADMIN_TOKEN=your-secret-token-here
```

**注意**: `ADMIN_TOKEN` は管理画面へのログインに使用します。安全な文字列を設定してください。

### 4. Googleカレンダー連携の設定（オプション）

予約時に自動的にGoogleカレンダーにイベントを作成し、予約者に招待メールを送信する機能です。

#### 4.1 Google Cloud Platformでサービスアカウントを作成

**サービスアカウント方式を選択した理由:**
- ユーザー認証不要で自動化に最適
- 主催者のカレンダーに直接イベントを作成できる
- OAuth認証フローが不要でシンプル
- サーバーサイドで完結するため安全

**設定手順:**

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/ にアクセス
   - 新しいプロジェクトを作成（または既存のプロジェクトを選択）

2. **Google Calendar APIを有効化**
   - 「APIとサービス」→「ライブラリ」を開く
   - "Google Calendar API" を検索
   - 「有効にする」をクリック

3. **サービスアカウントを作成**
   - 「APIとサービス」→「認証情報」を開く
   - 「認証情報を作成」→「サービスアカウント」を選択
   - サービスアカウント名を入力（例: "account-review-calendar"）
   - 「作成して続行」をクリック
   - ロールは不要なので「続行」→「完了」

4. **秘密鍵を生成**
   - 作成したサービスアカウントをクリック
   - 「キー」タブを開く
   - 「鍵を追加」→「新しい鍵を作成」
   - 「JSON」を選択して「作成」
   - ダウンロードされたJSONファイルを安全な場所に保存

5. **JSONファイルから情報を取得**
   ```json
   {
     "type": "service_account",
     "project_id": "your-project",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "account-review-calendar@your-project.iam.gserviceaccount.com",
     ...
   }
   ```
   - `client_email` の値を `GOOGLE_SERVICE_ACCOUNT_EMAIL` に設定
   - `private_key` の値を `GOOGLE_PRIVATE_KEY` に設定

#### 4.2 Googleカレンダーの設定

1. **カレンダーを作成または選択**
   - https://calendar.google.com/ にアクセス
   - 新しいカレンダーを作成（例: "アカウント添削会予約"）
   - または既存のカレンダーを使用

2. **サービスアカウントに権限を付与**
   - カレンダーの「設定と共有」を開く
   - 「特定のユーザーと共有」セクションで「ユーザーを追加」
   - サービスアカウントのメールアドレス（`GOOGLE_SERVICE_ACCOUNT_EMAIL`）を入力
   - 権限を「予定の変更権限」に設定
   - 「送信」をクリック

3. **カレンダーIDを取得**
   - カレンダーの「設定」を開く
   - 「カレンダーの統合」セクションでカレンダーIDを確認
   - 例: `xxxxx@group.calendar.google.com`
   - この値を `GOOGLE_CALENDAR_ID` に設定

#### 4.3 環境変数に追加

`.env.local` に以下を追加:

```env
# Google Calendar Integration (Optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=account-review-calendar@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=xxxxx@group.calendar.google.com
```

**重要:**
- `GOOGLE_PRIVATE_KEY` は改行文字 `\n` を含む文字列としてダブルクォートで囲む
- JSONファイルから直接コピーした値をそのまま使用
- これらの環境変数を設定しない場合、カレンダー連携は無効化され、予約機能は正常に動作します

#### 4.4 動作確認

環境変数を設定後、アプリケーションを再起動:

```bash
npm run dev
```

予約を作成すると:
1. データベースに予約が保存される
2. Googleカレンダーにイベントが作成される
3. 予約者のメールアドレスに招待メールが自動送信される
4. `bookings` テーブルの `calendar_status` が `created` になる

カレンダー連携が失敗しても予約は正常に作成されます（`calendar_status` が `failed` になる）。

### 5. ローカル起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスします。

## 使い方

### 公開ページ（日程枠一覧）

http://localhost:3000 にアクセスすると、管理画面で作成した日程枠の一覧が表示されます。

### 管理画面

http://localhost:3000/admin にアクセスすると、管理画面のログイン画面が表示されます。

1. `.env.local` で設定した `ADMIN_TOKEN` を入力してログイン
2. 「新規日程枠作成」フォームで開始日時を入力
   - 終了時刻は自動的に+1時間
   - 定員は5名固定
3. 「日程枠を作成」ボタンをクリック
4. 作成された日程枠が一覧に表示されます
5. 公開ページに自動的に反映されます

## Vercelへのデプロイ

本番環境へのデプロイ手順を説明します。

### 1. Vercelプロジェクトの作成

1. **Vercelアカウントの作成**
   - https://vercel.com にアクセス
   - GitHubアカウントでサインアップ

2. **リポジトリの準備**
   - このプロジェクトをGitHubリポジトリにプッシュ
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

3. **Vercelで新規プロジェクトを作成**
   - Vercelダッシュボードで「Add New Project」をクリック
   - GitHubリポジトリを選択してインポート
   - Framework Preset: Next.js（自動検出）
   - Root Directory: そのまま
   - Build Command: `npm run build`（デフォルト）
   - Output Directory: `.next`（デフォルト）

### 2. 環境変数の設定

Vercelプロジェクトの「Settings」→「Environment Variables」で以下を設定:

#### 必須の環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseの匿名キー | `eyJhbGc...` |
| `ADMIN_TOKEN` | 管理画面ログイン用トークン | `your-secret-token-123` |

#### オプション（Googleカレンダー連携を使う場合）

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | サービスアカウントのメール | `account-review@project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | サービスアカウントの秘密鍵 | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| `GOOGLE_CALENDAR_ID` | カレンダーID | `xxxxx@group.calendar.google.com` |

**重要:**
- すべての環境変数に対して「Production」「Preview」「Development」すべてにチェック
- `GOOGLE_PRIVATE_KEY` は改行文字 `\n` を含む文字列としてダブルクォートで囲む
- `ADMIN_TOKEN` は推測されにくい安全な文字列を使用

### 3. デプロイの実行

1. 環境変数を設定後、「Deployments」タブに移動
2. 「Redeploy」をクリック（または自動的にデプロイが開始される）
3. デプロイ完了後、提供されたURLにアクセス

### 4. デプロイ後の確認

デプロイ完了後、以下を確認:

1. **公開ページにアクセス**
   - `https://your-project.vercel.app`
   - 日程一覧ページが表示されることを確認

2. **管理画面にアクセス**
   - `https://your-project.vercel.app/admin`
   - `ADMIN_TOKEN` でログインできることを確認

3. **Supabase接続の確認**
   - ブラウザの開発者ツールでエラーがないか確認
   - 管理画面で日程枠を作成できるか確認

4. **Googleカレンダー連携の確認（設定済みの場合）**

   **確認手順:**
   1. テスト用の日程枠を作成
   2. テスト予約を実行（自分のメールアドレスを使用）
   3. Vercelの「Deployments」→最新のデプロイ→「Functions」タブでログを確認:
      ```
      [Calendar] サービスアカウント: account-review@proj...
      [Calendar] カレンダーID: xxxxx@group.calendar.goo...
      [Calendar] イベント作成開始 - attendee: test@example.com, slot: 2026-02-20T14:00
      [Calendar] attendees に追加: test@example.com
      [Calendar] イベント作成成功 - event_id: abc123xyz, 処理時間: 1234ms
      [Calendar] 招待メール送信先: test@example.com
      [Calendar] イベントリンク: https://www.google.com/calendar/event?eid=...
      ```
   4. メールボックスを確認して招待メールが届いていることを確認
   5. 主催者のGoogleカレンダーにイベントが作成されていることを確認
   6. 管理画面で予約者一覧を開き、「カレンダー」列が「連携済」になっていることを確認

   **エラーが発生した場合:**
   - Vercelのログで `[Calendar Error]` を検索
   - エラータイプ（auth / permission / not_found / rate_limit）を確認
   - 上記「トラブルシューティング > カレンダー連携が失敗する」を参照
   - 管理画面の「再送」ボタンで再試行可能

   **よくあるエラーと対処法:**

   | エラータイプ | 原因 | 対処法 |
   |------------|------|--------|
   | `auth` | サービスアカウントの認証情報が無効 | `GOOGLE_PRIVATE_KEY` の改行文字 `\n` を確認 |
   | `permission` | カレンダーへのアクセス権限がない | サービスアカウントをカレンダーに共有 |
   | `not_found` | カレンダーIDが間違っている | `GOOGLE_CALENDAR_ID` を再確認 |
   | `validation` | メールアドレスが不正 | 予約フォームの入力内容を確認 |

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start

# Linter実行
npm run lint
```

## 運用フロー

本番環境での日常的な運用手順を説明します。

### 基本的な運用サイクル

#### 1. 日程枠の作成（主催者）

1. 管理画面にアクセス: `https://your-project.vercel.app/admin`
2. `ADMIN_TOKEN` でログイン
3. 「新規日程枠作成」フォームで開始日時を入力
   - 例: `2026-02-15T10:00`
   - 終了時刻は自動的に+1時間（11:00）
   - 定員は5名固定
4. 「日程枠を作成」ボタンをクリック
5. 日程枠一覧に新しい枠が表示される
6. 公開ページに自動的に反映される

#### 2. 予約受付（講師）

1. 公開ページにアクセス: `https://your-project.vercel.app`
2. 日程一覧から希望の日時を選択
3. 「予約する」ボタンをクリック
4. 予約フォームに必要情報を入力:
   - 名前（必須）
   - メールアドレス（必須）
   - 講師名（必須）
   - ジャンル（必須）
   - 事前課題URL（任意）
5. 「予約を確定する」ボタンをクリック
6. 予約完了ページが表示される
7. Googleカレンダー連携が有効な場合:
   - 主催者のカレンダーにイベントが作成される
   - 講師のメールアドレスに招待メールが送信される

#### 3. 予約状況の確認（主催者）

1. 管理画面の日程枠一覧で予約数を確認
   - 「予約数」列: 現在の予約数
   - 「残席」列: 残りの空席数
   - 「状態」列: 受付中 / 満席
2. 日程枠行をクリックして予約者一覧を表示
3. 予約者の詳細情報を確認:
   - 名前、メールアドレス
   - 講師名、ジャンル
   - 事前資料URL（クリックで開く）
   - カレンダー連携状態

#### 4. 予約データのエクスポート（主催者）

**全予約をエクスポート:**
1. 管理画面右上の「全予約をCSVエクスポート」をクリック
2. `all_bookings_YYYY-MM-DD.csv` がダウンロードされる

**特定日程枠のみエクスポート:**
1. 日程枠一覧の「CSV」ボタンをクリック
2. `bookings_{slot_id}_YYYY-MM-DD.csv` がダウンロードされる

**CSVの活用:**
- Excelやスプレッドシートで開いて集計
- 参加者リストの作成
- 事前資料URLの一覧確認

#### 5. 満席の自動処理

予約が定員（5名）に達すると:
1. 自動的に `status` が `closed` に変更される
2. 公開ページで「満席」と表示される
3. 予約ボタンが無効化される
4. 追加の予約を受け付けなくなる

**同時予約の制御:**
- 複数人が同時に予約しても定員を超えない
- データベースの行ロック機能で制御
- 定員に達した場合は「満席です」エラーを表示

### トラブルシューティング（運用時）

#### 予約が表示されない

1. Supabaseダッシュボードで `bookings` テーブルを確認
2. 該当の予約データが存在するか確認
3. `slot_id` が正しいか確認

#### カレンダー連携が失敗する

1. 管理画面で予約者一覧の「カレンダー」列を確認
2. 「失敗」と表示されている場合:
   - 環境変数が正しく設定されているか確認
   - サービスアカウントの権限を確認
   - Vercelのログを確認（Function Logs）
3. エラーログから原因を特定:

   **認証エラー（401 Unauthorized）:**
   ```
   [Calendar Error] タイプ: auth
   [Calendar Error] メッセージ: 認証エラー: サービスアカウントの認証に失敗しました
   [Calendar Error] 詳細: サービスアカウントの認証情報が無効です...
   ```
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` と `GOOGLE_PRIVATE_KEY` を再確認
   - サービスアカウントキーが正しいJSON形式か確認
   - 秘密鍵に `-----BEGIN PRIVATE KEY-----` が含まれているか確認

   **権限エラー（403 Forbidden）:**
   ```
   [Calendar Error] タイプ: permission
   [Calendar Error] メッセージ: 権限エラー: カレンダーへのアクセスが拒否されました
   [Calendar Error] 詳細: カレンダーへのアクセス権限がありません...
   ```
   - Google Calendarの設定で、サービスアカウントのメールアドレスを共有設定に追加
   - 権限を「予定の変更」に設定

   **カレンダーIDエラー（404 Not Found）:**
   ```
   [Calendar Error] タイプ: not_found
   [Calendar Error] メッセージ: カレンダーIDエラー: 指定されたカレンダーが見つかりません
   [Calendar Error] 詳細: カレンダーが見つかりません...
   ```
   - `GOOGLE_CALENDAR_ID` が正しいか確認
   - カレンダー設定 > 「カレンダーの統合」で正しいカレンダーIDをコピー

   **レート制限エラー（429 Too Many Requests）:**
   ```
   [Calendar Error] タイプ: rate_limit
   [Calendar Error] メッセージ: レート制限エラー: APIの使用制限に達しました
   [Calendar Error] 詳細: Google Calendar APIのレート制限に達しました...
   ```
   - 数分待ってから再試行
   - Google Cloud Consoleでクォータ制限を確認

4. **カレンダー招待の再送機能:**
   - 管理画面の予約者一覧で「再送」ボタンをクリック
   - カレンダーイベントを再作成して招待メールを再送
   - 失敗時はエラー詳細がポップアップで表示される

#### 予約が重複している

1. `bookings` テーブルの UNIQUE 制約により、同じメールアドレスでは重複予約できない
2. もし重複データがある場合は、Supabaseダッシュボードから手動で削除

### 定期的なメンテナンス

#### 過去の日程枠のクリーンアップ

古い日程枠を削除する場合（Supabaseダッシュボードで実行）:

```sql
-- 過去の日程枠を削除（予約データも CASCADE で削除される）
DELETE FROM slots
WHERE starts_at < NOW() - INTERVAL '30 days';
```

#### データのバックアップ

定期的にCSVエクスポートを実行してバックアップを取得:
1. 月次で「全予約をCSVエクスポート」を実行
2. ファイル名に日付を含めて保存
3. 安全な場所に保管

### カスタムドメインの設定（オプション）

Vercelでカスタムドメインを使用する場合:

1. Vercelプロジェクトの「Settings」→「Domains」
2. 「Add」をクリックしてドメインを入力
3. DNS設定で指示されたレコードを追加:
   - A レコード: Vercelの IP アドレス
   - または CNAME レコード: `cname.vercel-dns.com`
4. DNS伝播を待つ（最大48時間）
5. HTTPSが自動的に有効化される

## データベーススキーマ

### slots テーブル（日程枠）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| starts_at | TIMESTAMP | 開始日時 |
| ends_at | TIMESTAMP | 終了日時（starts_at + 1時間、自動計算） |
| capacity | INTEGER | 定員（デフォルト: 5） |
| booked_count | INTEGER | 予約数（デフォルト: 0） |
| status | VARCHAR | ステータス（open / closed） |
| created_at | TIMESTAMP | 作成日時 |

### bookings テーブル（予約）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| slot_id | UUID | 日程枠ID（外部キー） |
| name | VARCHAR | 予約者名 |
| email | VARCHAR | メールアドレス |
| coach_name | VARCHAR | 講師名 |
| genre | VARCHAR | ジャンル |
| prework_url | TEXT | 事前課題URL（Googleスプレッドシート等） |
| created_at | TIMESTAMP | 作成日時 |
| calendar_event_id | VARCHAR | GoogleカレンダーイベントID |
| calendar_status | VARCHAR | カレンダー連携ステータス |

**制約:**
- 同一日程枠に同じメールアドレスで重複予約できない（UNIQUE制約）

## 実装済みの機能

### データベーストリガー

1. **予約数の自動カウント**: 予約の追加・削除時に `booked_count` が自動更新されます
2. **満席時の自動クローズ**: `booked_count` が `capacity` に達すると、自動的に `status` が `closed` になります
3. **定員超過の防止**: 予約追加時に定員チェックを行い、満席の場合はエラーを返します
4. **行ロックによる同時予約対策**: 複数人が同時に予約しても定員を超えないように制御します

### Generated Column

- **ends_at**: `starts_at` から自動的に1時間後の時刻を計算します

### トランザクション予約（RPC）

**create_booking RPC関数**: PostgreSQL関数を使用したアトミックな予約処理

処理フロー:
1. slot の行ロック取得（`FOR UPDATE`）
2. 定員チェック（`booked_count < capacity`）
3. ステータスチェック（`status = 'open'`）
4. 予約データ挿入
5. booked_count の自動更新（トリガー）
6. status の自動更新（capacity に達したら `closed`）

エラーハンドリング:
- 日程枠が見つからない場合
- 満席の場合
- 重複予約（同じメールアドレス）
- ステータスが closed の場合

### Googleカレンダー連携

**機能概要:**
- 予約完了時に主催者のGoogleカレンダーにイベントを自動作成
- 予約者に招待メールを自動送信
- サービスアカウント方式による安全な連携

**イベント内容:**
- タイトル: `5対1 アカウント添削会｜講師名：{coach_name}｜ジャンル：{genre}`
- 説明文: 予約者情報、講師名、ジャンル、事前資料URL
- 参加者: 予約者のメールアドレス
- リマインダー: 1日前（メール）、30分前（ポップアップ）

**calendar_status の値:**
- `disabled`: カレンダー連携が無効（環境変数未設定）
- `created`: カレンダーイベント作成成功
- `failed`: カレンダーイベント作成失敗（予約自体は成功）

## テスト手順

### 1. 基本的な予約フロー

#### 1.1 管理画面で日程枠を作成

1. http://localhost:3000/admin にアクセス
2. ADMIN_TOKEN でログイン
3. 開始日時を入力（例: `2026-02-01T10:00`）
4. 定員5名の日程枠が作成されることを確認

#### 1.2 公開ページで予約

1. http://localhost:3000 にアクセス
2. 作成した日程枠が表示されることを確認
3. 「予約する」ボタンをクリック
4. 予約フォームに必要情報を入力:
   - 名前: テスト太郎
   - メールアドレス: test1@example.com
   - 講師名: 山田太郎
   - ジャンル: ビジネス
   - 事前課題URL: (任意)
5. 「予約を確定する」ボタンをクリック
6. 予約完了ページが表示されることを確認

#### 1.3 残席数の確認

1. トップページに戻る
2. 残席数が「残り4名」に減っていることを確認

### 2. 定員超過の防止テスト

#### 2.1 定員まで予約を埋める

1. 手順1.2を繰り返して、合計5名分の予約を作成
   - test1@example.com
   - test2@example.com
   - test3@example.com
   - test4@example.com
   - test5@example.com
2. トップページで「満席」表示になることを確認
3. 予約ボタンが無効化されていることを確認

#### 2.2 満席後の予約試行

**方法1: UI経由（ボタンが無効化されているため不可）**
- 満席の日程枠は予約ボタンが無効化されている

**方法2: API直接呼び出しテスト（開発者向け）**

ブラウザの開発者ツールコンソールで実行:

```javascript
// 満席の slot_id を取得
const response = await fetch('/api/slots');
const slots = await response.json();
const fullSlot = slots.find(s => s.status === 'closed');

// 満席の枠に予約を試みる
const bookingResponse = await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slot_id: fullSlot.id,
    name: 'テスト次郎',
    email: 'test6@example.com',
    coach_name: '田中花子',
    genre: 'エンタメ'
  })
});

const result = await bookingResponse.json();
console.log(result); // { error: 'この日程枠は既に満席です' }
```

期待される結果:
- ステータスコード: 400
- エラーメッセージ: 「この日程枠は既に満席です」

### 3. 重複予約の防止テスト

同じメールアドレスで同じ日程枠に2回予約を試みる:

1. test1@example.com で予約済みの日程枠に再度予約
2. エラーメッセージ「このメールアドレスで既に予約済みです」が表示されることを確認

開発者ツールコンソールでのテスト:

```javascript
// 既に予約済みのメールアドレスで再予約を試みる
const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slot_id: 'existing-slot-id',
    name: 'テスト太郎',
    email: 'test1@example.com', // 既に予約済み
    coach_name: '山田太郎',
    genre: 'ビジネス'
  })
});

const result = await response.json();
console.log(result); // { error: 'このメールアドレスで既に予約済みです' }
```

### 4. 同時予約のテスト（高度）

複数のリクエストが同時に発生しても定員超過が発生しないことを確認します。

#### 方法1: HTMLテストツール（推奨）

専用のテストツールを使用して、同時予約の挙動を自動テストできます。

1. `scripts/test-concurrent-booking.html` をブラウザで開く
2. API URLを入力（例: `http://localhost:3000`）
3. 「日程枠一覧を取得」ボタンをクリック
4. テスト対象の日程枠を選択（定員5名、空き5名の枠を推奨）
5. 同時リクエスト数を設定（デフォルト: 10件）
6. 「テスト実行」ボタンをクリック

**期待される結果:**
- 10件のリクエスト中、5件のみが成功
- 残り5件は「この日程枠は既に満席です」エラー
- `booked_count` が capacity を超えない
- `status` が 'closed' になる

詳細は `TESTING.md` のシナリオ7を参照してください。

#### 方法2: 手動テスト

1. 残席1名の日程枠を用意
2. 2つのブラウザタブで同時に予約フォームを開く
3. 両方で同時に「予約を確定する」をクリック
4. 1つは成功、もう1つは「満席です」エラーになることを確認
5. データベースで `booked_count` が capacity を超えていないことを確認

### 5. データベース確認（Supabaseダッシュボード）

Supabaseの「Table Editor」で以下を確認:

#### slots テーブル
- `booked_count` が予約数と一致している
- 満席の枠は `status = 'closed'` になっている

```sql
SELECT id, starts_at, capacity, booked_count, status
FROM slots
ORDER BY starts_at;
```

#### bookings テーブル
- 予約データが正しく保存されている
- `slot_id` が正しい外部キーになっている

```sql
SELECT b.*, s.starts_at
FROM bookings b
JOIN slots s ON b.slot_id = s.id
ORDER BY b.created_at DESC;
```

### トラブルシューティング

#### RPC関数のエラー

RPCエラーが発生した場合、Supabaseダッシュボードで関数が正しく作成されているか確認:

```sql
-- RPC関数の存在確認
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'create_booking';
```

関数が見つからない場合、`lib/supabase/schema.sql` の RPC関数定義部分を再実行してください。

## デバッグ手順

### ローカル環境のデバッグ

#### 1. 環境変数チェック

起動前に必要な環境変数が設定されているか確認します。

```bash
npm run check-env
```

このコマンドは以下をチェックします:
- ✅ Supabase URL/KEY が設定済みか
- ✅ Admin Token が設定済みか
- ℹ️ Google Calendar連携の状態（任意）

エラーが出た場合は `.env.local` を確認してください。

#### 2. ローカル起動チェックリスト

```bash
# ステップ1: 環境変数チェック（自動実行）
npm run dev

# ステップ2: ブラウザで確認
# http://localhost:3000 にアクセス
# - 日程一覧が表示されるか
# - コンソールにエラーが出ていないか

# ステップ3: Supabase接続確認
# ブラウザの開発者ツール > Network タブで
# - /api/slots へのリクエストが成功しているか（200 OK）
# - レスポンスデータが返ってきているか

# ステップ4: Admin認証確認
# http://localhost:3000/admin にアクセス
# - ログインフォームが表示されるか
# - ADMIN_TOKEN でログインできるか
```

#### 3. API実行時のログ確認

開発環境では詳細なログが出力されます:

```
[API] GET /api/slots
[API] Slots GET: 5件取得

[API] POST /api/bookings
[API] Bookings POST: 予約作成開始 - slot_id: xxx, email: xxx@example.com
[API] Bookings POST: 予約作成成功 - booking_id: xxx
[API] Bookings POST: Googleカレンダー連携開始
[API] Bookings POST: カレンダー作成成功 - event_id: xxx
```

**注意**: 秘密情報（トークン、パスワード、APIキー）はログに出力されません。

### 本番環境（Vercel）のデバッグ

#### 1. 環境変数の確認

Vercel ダッシュボード > Settings > Environment Variables で以下を確認:

必須:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `ADMIN_TOKEN`

任意（カレンダー連携を使う場合）:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CALENDAR_ID`

**重要**: 環境変数を変更した後は、再デプロイが必要です。

#### 2. Vercelログの確認

```
Vercel ダッシュボード > Deployments > [最新デプロイ] > Runtime Logs
```

ログで確認すべきポイント:
- API呼び出しのログ（`[API]` プレフィックス）
- エラースタック（500エラー時）
- Supabase接続エラー
- Google Calendar連携エラー

#### 3. 重要APIのログ戦略

##### 日程枠作成 (`/api/slots`)
```
[API] POST /api/slots
[API] Slots POST: 日程枠作成開始 - starts_at: xxx, capacity: 5
[API] Slots POST: 日程枠作成成功 - ID: xxx
```

エラー時:
```
[API Error] /api/slots POST
Error: <エラーメッセージ>
Context: {"starts_at": "...", "capacity": 5}
```

##### 予約作成 (`/api/bookings`)
```
[API] POST /api/bookings
[API] Bookings POST: 予約作成開始 - slot_id: xxx, email: xxx
[API] Bookings POST: 予約作成成功 - booking_id: xxx
[API] Bookings POST: Googleカレンダー連携開始
[API] Bookings POST: カレンダー作成成功 - event_id: xxx
```

エラー時:
```
[API] Bookings POST: 予約失敗 - この日程枠は既に満席です
[API] Bookings POST: カレンダー作成失敗: <エラー詳細>
```

#### 4. 500エラー発生時の対応

ユーザー側には以下のように表示されます:
- 予約フォーム: 「サーバーエラーが発生しました。しばらく待ってから再度お試しください。」
- 満席時: 「申し訳ございません。この日程枠は既に満席になりました。他の日程をお選びください。」
- 重複予約: 「このメールアドレスで既に予約されています。別のメールアドレスをご利用ください。」

管理者側で確認すべきこと:
1. Vercel Runtime Logsで詳細エラーを確認
2. Supabase > Logsでデータベースエラーを確認
3. 環境変数が正しく設定されているか再確認

#### 5. よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|--------|
| `認証に失敗しました` | ADMIN_TOKEN が間違っている | Vercelの環境変数を確認、再デプロイ |
| `Supabase connection failed` | Supabase URL/KEY が間違っている | .env.local または Vercel環境変数を確認 |
| `Calendar creation failed` | Google認証情報が間違っている | サービスアカウントキーを再確認 |
| `この日程枠は既に満席です` | 同時アクセスで満席になった | ユーザーに他の日程を選択してもらう |
| `既に予約済みです` | 同じメールアドレスで重複予約 | 別のメールアドレスを使用 |

## 本番環境でのデバッグ手順

Vercelにデプロイした後の本番環境で問題が発生した場合の診断手順を説明します。

### 1. Vercel Function Logsの見方

#### ログへのアクセス

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Deployments」タブを開く
4. 最新のデプロイメント（またはエラーが発生したデプロイメント）をクリック
5. 「Functions」タブを開く
6. 該当する関数（例: `app/api/bookings/route.func`）をクリック

#### ログのフィルタリング

**検索機能を活用:**
- `[API] Bookings POST:` で予約APIのログのみ表示
- `[Calendar]` でカレンダー関連ログのみ表示
- `[API] Slots POST:` で枠作成ログのみ表示
- `[API Error]` でエラーログのみ表示

**時刻で絞り込む:**
- ユーザーから報告されたエラーの発生時刻を確認
- ログの時刻（UTC）と比較して該当する範囲を絞り込む

### 2. 予約処理のログトレース方法

予約が正常に完了した場合のログの流れ:

```
[API] POST /api/bookings
[API] Bookings POST: 予約作成開始 - slot_id: abc-123, email: user@example.com
[API] Bookings POST: RPC create_booking 呼び出し
[API] Bookings POST: 予約作成成功 - booking_id: def-456
[API] Bookings POST: Googleカレンダー連携開始
[Calendar] サービスアカウント初期化 - service_account: account-review@proj...
[Calendar] イベント作成開始 - attendee: user@example.com, slot_starts_at: 2026-02-20T14:00
[Calendar] attendees に追加: user@example.com
[Calendar] イベント作成成功 - event_id: ghi789, processing_time_ms: 1234, attendee: user@example.com
[API] Bookings POST: カレンダー作成成功 - event_id: ghi789
```

**ログから読み取れる情報:**
- 予約処理が開始された時刻
- 予約者のメールアドレス
- 対象の日程枠ID
- 予約ID（成功時）
- カレンダー連携の成否とイベントID
- カレンダーAPI呼び出しの処理時間（パフォーマンス監視）

### 3. エラー発生時の診断フロー

#### 3.1 予約は成功したがカレンダー作成に失敗

**ログの例:**
```
[API] Bookings POST: 予約作成成功 - booking_id: def-456
[API] Bookings POST: Googleカレンダー連携開始
[Calendar] イベント作成開始 - attendee: user@example.com
[Calendar Error] カレンダー作成失敗 - error_type: permission, processing_time_ms: 567
[Calendar Error] メッセージ: 権限エラー: カレンダーへのアクセスが拒否されました
[Calendar Error] 詳細: カレンダーへのアクセス権限がありません。サービスアカウント（account-review@proj...）をカレンダーに共有してください。
[API] Bookings POST: カレンダー作成失敗（予約は成功）
```

**診断:**
1. `booking_id: def-456` は作成されているので、予約自体は成功
2. `error_type: permission` から権限エラーと判明
3. サービスアカウントがカレンダーに共有されていないことが原因
4. 管理画面の「再送」ボタンで、権限修正後に再送可能

**対処:**
1. Google Calendarの設定を開く
2. サービスアカウント（`account-review@proj...`）を共有設定に追加
3. 権限を「予定の変更」に設定
4. 管理画面から「再送」ボタンをクリック

#### 3.2 予約自体が失敗（満席）

**ログの例:**
```
[API] Bookings POST: 予約作成開始 - slot_id: abc-123, email: user@example.com
[API] Bookings POST: RPC create_booking 呼び出し
[API] Bookings POST: 予約失敗 - この日程枠は既に満席です
```

**診断:**
1. RPC内で満席が検知されている
2. ユーザーには「満席です」エラーが返されている
3. 予約データは作成されていない（正常な挙動）

**対処:**
- ユーザーに別の日程を選択してもらう
- 必要に応じて追加の日程枠を作成

#### 3.3 データベースエラー

**ログの例:**
```
[API] Bookings POST: 予約作成開始 - slot_id: abc-123, email: user@example.com
[API Error] /api/bookings RPC
Error: PGRST116 - The result contains 0 rows
Context: {"slot_id": "abc-123", "email": "user@example.com"}
```

**診断:**
1. Supabase接続エラーまたはRPC関数の問題
2. slot_id が存在しない可能性

**対処:**
1. Supabaseダッシュボードで `slots` テーブルを確認
2. 該当のslot_idが存在するか確認
3. RPC関数 `create_booking` が正しく作成されているか確認:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'create_booking';
   ```

### 4. ログ保持期間と対策

**Vercelのログ保持期間:**
- **Free プラン:** 最大24時間
- **Pro プラン:** 最大14日間
- **Enterprise プラン:** カスタマイズ可能

**重要なログは別途記録を推奨:**
- 予約完了時の通知メール（ユーザー・管理者双方）
- 定期的なCSVエクスポート（予約データのバックアップ）
- Sentry等の外部エラートラッキングサービス（後述）

### 5. エラーコード別対処法クイックリファレンス

| エラーコード/タイプ | 原因 | 対処法 | ログの検索キーワード |
|----------------|------|--------|------------------|
| `error_type: auth` | サービスアカウント認証失敗 | `GOOGLE_PRIVATE_KEY` の改行文字 `\n` を確認 | `[Calendar Error] タイプ: auth` |
| `error_type: permission` | カレンダーアクセス権限なし | サービスアカウントをカレンダーに共有 | `[Calendar Error] タイプ: permission` |
| `error_type: not_found` | カレンダーIDが間違っている | `GOOGLE_CALENDAR_ID` を再確認 | `[Calendar Error] タイプ: not_found` |
| `error_type: rate_limit` | APIレート制限 | 数分待ってから再試行 | `[Calendar Error] タイプ: rate_limit` |
| `error_type: validation` | メールアドレス等の入力不正 | 予約データを確認 | `[Calendar Error] タイプ: validation` |
| `error_type: network` | ネットワークエラー | Vercelのステータスページを確認 | `[Calendar Error] タイプ: network` |
| `予約失敗 - 満席` | 定員に達している | 正常な挙動、他の日程を案内 | `[API] Bookings POST: 予約失敗` |
| `既に予約済み` | 同じメールアドレスで重複 | 正常な挙動、エラーメッセージを確認 | `このメールアドレスで既に予約済みです` |

### 6. パフォーマンス監視

**カレンダーAPI呼び出しの処理時間:**

正常範囲:
```
[Calendar] イベント作成成功 - processing_time_ms: 800
```

遅い（要注意）:
```
[Calendar] イベント作成成功 - processing_time_ms: 5000
```

**処理時間が長い場合の対処:**
- Google Calendar APIのステータスを確認: https://www.google.com/appsstatus
- レート制限に近づいていないかVercelログで確認
- 一時的な問題の可能性があるため、数分後に再試行

### 7. ユーザー向けエラーメッセージの改善

本番環境では、ユーザーに以下のような分かりやすいエラーメッセージが表示されます:

**予約API（500エラー時）:**
```json
{
  "error": "サーバーエラーが発生しました。しばらく待ってから再度お試しください。",
  "error_details": "予約処理中にデータベースエラーが発生しました。問題が解決しない場合は、お手数ですが別の日程をお試しいただくか、管理者にお問い合わせください。",
  "retry_suggested": true
}
```

**日程枠取得エラー:**
```json
{
  "error": "日程枠の読み込みに失敗しました。",
  "error_details": "システムエラーが発生しました。ページを更新してもう一度お試しください。",
  "retry_suggested": true
}
```

**管理者側のログには詳細情報が残る:**
- エラーの種類（DB接続エラー、RPC失敗等）
- 元のエラーメッセージ
- 入力データ（email, slot_id等）

### 8. Sentry導入（推奨・任意）

本番環境でのエラー監視には Sentry の利用を推奨します（無料枠で十分使えます）。

#### Sentryを使うメリット

1. **リアルタイムエラー通知:**
   - 500エラーが発生した瞬間にメール/Slack通知
   - ユーザーからの報告を待たずに対応可能

2. **詳細なエラー情報:**
   - スタックトレース
   - ユーザーのブラウザ情報
   - エラー発生時のURL
   - カスタムコンテキスト（slot_id, email等）

3. **エラーの集計とトレンド分析:**
   - 同じエラーの発生頻度
   - 影響を受けたユーザー数
   - エラー発生率の推移

4. **無料プランで十分:**
   - 月間5,000エラーまで無料
   - 小規模アプリケーションには十分

#### Sentryセットアップ手順

**1. Sentryアカウント作成**

1. https://sentry.io/ にアクセス
2. 無料アカウントを作成（GitHub/Googleアカウントで登録可能）
3. 新規プロジェクトを作成
   - プラットフォーム: **Next.js** を選択
   - プロジェクト名: `account-review-booking`（任意）

**2. Sentryインストール（ローカル環境）**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

ウィザードが自動的に:
- 設定ファイルを生成（`sentry.client.config.ts`, `sentry.server.config.ts`）
- `next.config.ts` にSentry設定を追加
- `.env.local` にDSNを追加

**3. 環境変数設定**

`.env.local` に追加（ウィザードが自動追加）:
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/789012
SENTRY_AUTH_TOKEN=your-auth-token
```

Vercelの環境変数にも同じ値を追加:
1. Vercel ダッシュボード > Settings > Environment Variables
2. `NEXT_PUBLIC_SENTRY_DSN` を追加（Production, Preview, Development）
3. `SENTRY_AUTH_TOKEN` を追加（Production のみでOK）

**4. カスタムエラー送信の実装**

予約APIでのエラー送信例（`app/api/bookings/route.ts`）:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // 予約処理
} catch (error) {
  // Sentryにエラーを送信（追加コンテキスト付き）
  Sentry.captureException(error, {
    tags: {
      api: 'bookings',
      action: 'create',
    },
    extra: {
      slot_id,
      email,
      coach_name,
      genre,
    },
  });

  logApiError('/api/bookings', error);
  return NextResponse.json({ error: '...' }, { status: 500 });
}
```

**5. Sentry通知設定**

Sentryダッシュボードで:
1. **Settings** > **Alerts** を開く
2. **Create Alert** をクリック
3. 以下の設定を推奨:
   - **Trigger:** When an event is captured
   - **Frequency:** Instantly（即座に通知）
   - **Actions:** Send email to... （管理者のメールアドレス）

Slackインテグレーション（オプション）:
1. **Settings** > **Integrations** > **Slack**
2. Slackワークスペースを連携
3. 通知先チャンネルを設定（例: `#booking-errors`）

**6. エラー発生時の確認方法**

Sentryダッシュボード:
1. **Issues** タブを開く
2. エラー一覧が時系列で表示される
3. エラーをクリックして詳細を確認:
   - スタックトレース
   - エラーメッセージ
   - カスタムコンテキスト（slot_id, email等）
   - 発生時刻とユーザー環境

**7. Sentryの無料プラン制限**

- **イベント数:** 月間5,000件まで
- **データ保持期間:** 30日間
- **メンバー数:** 1名（自分のみ）

**制限を超えないためのTips:**
- 本番環境のみSentryを有効化（開発環境では無効化）
- サンプリング設定で全エラーの一部のみ送信
- 重要度の低いエラーはフィルタリング

```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10%のみトレース
  environment: process.env.NODE_ENV, // production のみ有効化
  beforeSend(event) {
    // 開発環境ではSentryに送信しない
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }
    return event;
  },
});
```

**8. Sentryを使った実際のデバッグ例**

ユーザーから「予約ボタンを押してもエラーになる」という報告があった場合:

1. Sentryダッシュボードで最新のエラーを確認
2. エラー詳細から以下を特定:
   - エラーメッセージ: `PGRST116 - The result contains 0 rows`
   - slot_id: `abc-123`
   - 発生時刻: `2026-02-20 10:30:15 UTC`
3. Supabaseダッシュボードで `slots` テーブルを確認
4. slot_id `abc-123` が存在しないことを発見
5. 原因: 日程枠が削除されていたが、キャッシュされたページが古いslot_idを参照していた
6. 対処: ページをリロードしてもらい、最新の日程枠を表示

### 9. デバッグチェックリスト

問題が発生した際の診断手順:

**ステップ1: エラーの種類を特定**
- [ ] ユーザー側のエラーメッセージを確認
- [ ] 500エラー / 400エラー / 認証エラーのどれか
- [ ] 予約関連 / カレンダー関連 / その他のどれか

**ステップ2: ログを確認**
- [ ] Vercel Function Logsでエラーログを検索
- [ ] エラー発生時刻のログを特定
- [ ] エラーメッセージと入力データを確認

**ステップ3: データベースを確認**
- [ ] Supabaseダッシュボードで該当データを確認
- [ ] slots / bookings テーブルの状態を確認
- [ ] RPC関数が正しく動作しているか確認

**ステップ4: 環境変数を確認**
- [ ] Vercelの環境変数が正しく設定されているか
- [ ] カレンダー連携の環境変数（任意）
- [ ] 環境変数変更後に再デプロイしたか

**ステップ5: 外部サービスの状態確認**
- [ ] Supabaseのステータスページ: https://status.supabase.com/
- [ ] Google Workspace Status: https://www.google.com/appsstatus
- [ ] Vercelのステータスページ: https://www.vercel-status.com/

### 10. ロギングポリシー

本アプリケーションでは、詳細なロギングポリシーを `LOGGING_POLICY.md` に定義しています。

**主要な方針:**
- 重要APIのリクエスト開始・成功・失敗を必ずログ出力
- 個人情報保護のため、秘密鍵・トークンは絶対にログに出力しない
- エラー時は原因特定に必要な情報を構造化して出力
- カレンダーAPI呼び出しの処理時間を記録してパフォーマンス監視

詳細は `LOGGING_POLICY.md` を参照してください。

## その他のトラブルシューティング

### Supabaseに接続できない

- `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認
- Supabaseプロジェクトが正常に起動しているか確認
- ブラウザのコンソールでエラーメッセージを確認

### ポート3000が既に使用されている

```bash
# 別のポートで起動
PORT=3001 npm run dev
```

### TypeScriptのエラーが出る

```bash
# 型定義を再生成
npm run dev
```

初回起動時にNext.jsが自動的にTypeScriptの設定を最適化します。

## ライセンス

ISC
