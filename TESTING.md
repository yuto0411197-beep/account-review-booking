# 予約フロー検証シナリオ

このドキュメントでは、予約管理システムの基本フローを段階的に検証する手順をまとめています。

## 前提条件

- `.env.local` に必須の環境変数が設定済み
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ADMIN_TOKEN`
- Supabase でスキーマ（`lib/supabase/schema.sql`）が実行済み
- `npm install` が完了済み

## 検証シナリオ一覧

### シナリオ1: 管理画面で日程枠を作成

#### 実行手順
1. `npm run dev` でローカル起動
2. `http://localhost:3000/admin` にアクセス
3. `ADMIN_TOKEN` でログイン
4. 開始日時を入力（例: `2026-02-20T14:00`）
5. 「日程枠を作成」ボタンをクリック

#### 確認ポイント
- ✅ ログイン成功後、日程枠作成フォームが表示される
- ✅ 日程枠作成後、一覧に新しい枠が表示される
- ✅ 日時が正しく表示される（開始: 14:00、終了: 15:00）
- ✅ 定員が5名と表示される
- ✅ 予約数が0名、残席が5名と表示される
- ✅ 状態が「受付中」と表示される

#### ターミナルで確認すべきログ
```
=== 環境変数チェック ===
✓ Supabase URL: 設定済み
✓ Admin Token: 設定済み
✅ 環境変数チェック完了

[API] POST /api/slots
[API] Slots POST: 日程枠作成開始 - starts_at: 2026-02-20T14:00, capacity: 5
[API] Slots POST: 日程枠作成成功 - ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### 失敗時に見るログとエラー
| エラー | ログ | 原因 | 対処法 |
|-------|------|------|--------|
| ログインできない | `[API] Slots GET: 認証失敗` | ADMIN_TOKEN が間違っている | `.env.local` の `ADMIN_TOKEN` を確認 |
| 日程枠が作成されない | `[API Error] /api/slots POST` | Supabase接続エラー | Supabase URL/KEY を確認 |
| エラー: 開始日時は必須です | `[API] Slots POST: starts_at が未指定` | フォーム入力が空 | 日時を入力してから送信 |

#### データベースで確認
```sql
-- Supabaseダッシュボード > SQL Editor で実行
SELECT id, starts_at, ends_at, capacity, booked_count, status, created_at
FROM slots
ORDER BY created_at DESC
LIMIT 1;
```

期待される結果:
- `starts_at`: 入力した日時
- `ends_at`: `starts_at + 1時間`（自動生成）
- `capacity`: 5
- `booked_count`: 0
- `status`: 'open'

---

### シナリオ2: トップページに日程枠が表示される

#### 実行手順
1. `http://localhost:3000` にアクセス
2. 作成した日程枠が表示されることを確認

#### 確認ポイント
- ✅ 日程枠一覧が表示される
- ✅ 日時が正しく表示される（例: 2026年02月20日(木) 14:00 - 15:00）
- ✅ 残席数が表示される（例: 残り5名）
- ✅ 「予約する」ボタンが有効化されている
- ✅ 日程が古い順に並んでいる

#### ブラウザコンソールで確認すべきログ
開発者ツール（F12） > Console タブ
```
(ログなし - エラーがないことを確認)
```

#### ネットワークタブで確認
開発者ツール（F12） > Network タブ
- `/api/slots` リクエストが成功（Status: 200 OK）
- レスポンスに作成した日程枠データが含まれている

#### 失敗時に見るログとエラー
| エラー | 表示 | 原因 | 対処法 |
|-------|------|------|--------|
| 日程枠が表示されない | 「予約可能な日程がありません」 | DB に日程枠がない | シナリオ1を実行 |
| API エラー | コンソールに Fetch エラー | Supabase 接続失敗 | 環境変数を確認 |

---

### シナリオ3: 予約フォームから予約できる

#### 実行手順
1. トップページで「予約する」ボタンをクリック
2. 予約フォームに入力:
   - 名前: `テスト太郎`
   - メールアドレス: `test1@example.com`
   - 講師名: `山田太郎`
   - ジャンル: `ビジネス`
   - 事前課題URL: `https://docs.google.com/spreadsheets/...`（任意）
3. 「予約を確定する」ボタンをクリック

#### 確認ポイント
- ✅ 予約フォームが表示される
- ✅ 選択した日程枠の情報が表示される
- ✅ 予約確定後、予約完了ページにリダイレクトされる
- ✅ 完了ページに予約ID、日時、名前が表示される

#### ターミナルで確認すべきログ
```
[API] POST /api/bookings
[API] Bookings POST: 予約作成開始 - slot_id: xxxxxxxx, email: test1@example.com
[API] Bookings POST: 予約作成成功 - booking_id: yyyyyyyy
[API] Bookings POST: Googleカレンダー連携は無効
```

**カレンダー連携有効時:**
```
[API] Bookings POST: Googleカレンダー連携開始
[API] Bookings POST: カレンダー作成成功 - event_id: zzzzzzzz
```

#### 失敗時に見るログとエラー
| エラー | ログ | 原因 | 対処法 |
|-------|------|------|--------|
| 必須項目が入力されていません | `[API] Bookings POST: 必須項目不足` | フォーム未入力 | 全項目を入力 |
| サーバーエラーが発生しました | `[API Error] /api/bookings RPC` | RPC関数エラー | スキーマを再実行 |
| このメールアドレスで既に予約済みです | `[API] Bookings POST: 予約失敗 - ...` | 重複予約 | 別のメールアドレスを使用 |

#### データベースで確認
```sql
-- 予約データを確認
SELECT b.id, b.name, b.email, b.coach_name, b.genre,
       b.prework_url, b.calendar_status, b.created_at,
       s.starts_at
FROM bookings b
JOIN slots s ON b.slot_id = s.id
ORDER BY b.created_at DESC
LIMIT 1;
```

期待される結果:
- 入力したデータが正しく保存されている
- `calendar_status`: 'disabled'（カレンダー連携無効時）または 'created'（成功時）

---

### シナリオ4: 予約数（booked_count）が増える

#### 実行手順
1. シナリオ3を実行（1件予約）
2. 管理画面で日程枠一覧を確認
3. トップページで残席数を確認

#### 確認ポイント
- ✅ 管理画面の「予約数」が1名になる
- ✅ 管理画面の「残席」が4名になる
- ✅ トップページの残席表示が「残り4名」になる
- ✅ 状態が「受付中」のまま

#### データベースで確認
```sql
-- booked_count の自動更新を確認
SELECT id, starts_at, capacity, booked_count, status
FROM slots
WHERE id = 'シナリオ1で作成したslot_id'
```

期待される結果:
- `booked_count`: 1（トリガーで自動更新）
- `status`: 'open'

#### 失敗時に見るログとエラー
| エラー | 確認方法 | 原因 | 対処法 |
|-------|---------|------|--------|
| booked_count が増えない | DB確認 | トリガー未作成 | `schema.sql` のトリガー部分を再実行 |
| 予約数の表示がおかしい | 画面確認 | キャッシュ | ページをリロード |

---

### シナリオ5: 定員に達すると満席になり予約できなくなる

#### 実行手順
1. シナリオ3を5回繰り返し（異なるメールアドレスで）
   - `test1@example.com`
   - `test2@example.com`
   - `test3@example.com`
   - `test4@example.com`
   - `test5@example.com`
2. トップページを確認
3. 6人目の予約を試みる

#### 確認ポイント
- ✅ 5人目の予約完了後、管理画面の「予約数」が5名になる
- ✅ 管理画面の「残席」が0名になる
- ✅ 管理画面の「状態」が「満席」になる
- ✅ トップページで「満席」と表示される
- ✅ 「予約する」ボタンが無効化される
- ✅ 6人目の予約は受け付けない

#### 6人目の予約を試みた場合のログ
```
[API] Bookings POST: 予約作成開始 - slot_id: xxxxxxxx, email: test6@example.com
[API] Bookings POST: 予約失敗 - この日程枠は既に満席です
```

#### データベースで確認
```sql
-- 満席状態を確認
SELECT id, starts_at, capacity, booked_count, status
FROM slots
WHERE id = 'シナリオ1で作成したslot_id';

-- 予約数をカウント
SELECT slot_id, COUNT(*) as booking_count
FROM bookings
WHERE slot_id = 'シナリオ1で作成したslot_id'
GROUP BY slot_id;
```

期待される結果:
- `booked_count`: 5
- `status`: 'closed'（トリガーで自動更新）
- 予約数: 5件

#### 失敗時に見るログとエラー
| エラー | 原因 | 対処法 |
|-------|------|--------|
| 6人目の予約が通る | トリガー未動作 | `schema.sql` を再実行 |
| status が closed にならない | トリガー未作成 | `update_slot_status` トリガーを確認 |

---

### シナリオ6: Googleカレンダー招待が飛ぶ（または失敗理由が保存される）

#### 前提条件
Google Calendar連携の環境変数が設定済み:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CALENDAR_ID`

#### 実行手順
1. 環境変数を設定
2. `npm run dev` で再起動
3. シナリオ3を実行して予約

#### 確認ポイント（成功時）
- ✅ 予約完了時のログに「カレンダー作成成功」が表示される
- ✅ 管理画面の予約者一覧で「カレンダー」列が「連携済」になる
- ✅ 予約者のメールアドレスに招待メールが届く
- ✅ 主催者のGoogleカレンダーにイベントが作成される

#### ターミナルで確認すべきログ（成功時）
```
[API] Bookings POST: Googleカレンダー連携開始
[API] Bookings POST: カレンダー作成成功 - event_id: abc123xyz
```

#### 確認ポイント（失敗時）
- ✅ 予約自体は成功する
- ✅ ログに失敗理由が表示される
- ✅ 管理画面の「カレンダー」列が「失敗」になる

#### ターミナルで確認すべきログ（失敗時）
```
[API] Bookings POST: Googleカレンダー連携開始
[API] Bookings POST: カレンダー作成失敗: Error: Invalid credentials
```

#### データベースで確認
```sql
-- カレンダー連携状態を確認
SELECT id, name, email, calendar_status, calendar_event_id
FROM bookings
ORDER BY created_at DESC
LIMIT 1;
```

期待される結果:
- **成功時:**
  - `calendar_status`: 'created'
  - `calendar_event_id`: Google Calendar のイベントID（文字列）
- **失敗時:**
  - `calendar_status`: 'failed'
  - `calendar_event_id`: NULL
- **環境変数未設定時:**
  - `calendar_status`: 'disabled'
  - `calendar_event_id`: NULL

#### 失敗時に見るログとエラー
| エラー | ログ | 原因 | 対処法 |
|-------|------|------|--------|
| Invalid credentials | `カレンダー作成失敗: Invalid credentials` | 認証情報が間違っている | サービスアカウントキーを再確認 |
| Calendar not found | `カレンダー作成失敗: Not Found` | カレンダーIDが間違っている | `GOOGLE_CALENDAR_ID` を確認 |
| Permission denied | `カレンダー作成失敗: Forbidden` | サービスアカウントに権限がない | カレンダー共有設定を確認 |

---

### シナリオ7: 同時予約による定員超過の防止

#### 目的
複数ユーザーが同時に予約ボタンを押した場合でも、定員超過が発生しないことを確認します。

#### 前提条件
- RPC関数 `create_booking` が `FOR UPDATE` によるrow-level lockingを実装済み
- テスト用の日程枠（定員5名、空き枠）が存在すること

#### テスト方法1: HTMLテストツールを使用（推奨）

**実行手順:**
1. `scripts/test-concurrent-booking.html` をブラウザで開く
2. API URLを入力（例: `http://localhost:3000`）
3. 「日程枠一覧を取得」ボタンをクリック
4. テスト対象の日程枠を選択（定員5名、空き5名の枠を推奨）
5. 同時リクエスト数を設定（デフォルト: 10件）
6. 「テスト実行」ボタンをクリック

**確認ポイント:**
- ✅ 事前状態が正しく表示される（capacity: 5, booked_count: 0, status: open）
- ✅ 10件中5件のみが成功する
- ✅ 残り5件は失敗し「この日程枠は既に満席です」エラーが返る
- ✅ 事後状態で booked_count が5になる
- ✅ 事後状態で status が 'closed' になる
- ✅ **重要:** booked_count が capacity を超えない（6以上にならない）

**ログ出力例:**
```
========================================
🔥 同時予約テスト開始
API URL: http://localhost:3000
Slot ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
同時リクエスト数: 10
リクエスト間隔: 0ms
========================================
[事前状態] capacity: 5, booked_count: 0, status: open
========================================
📊 テスト結果サマリー
総実行時間: 1234ms
成功: 5件
失敗: 5件
========================================
[成功 #1] 123ms - booking_id: aaaaaaaa...
[成功 #2] 145ms - booking_id: bbbbbbbb...
[成功 #3] 156ms - booking_id: cccccccc...
[成功 #4] 167ms - booking_id: dddddddd...
[成功 #5] 178ms - booking_id: eeeeeeee...
[失敗 #6] 189ms - この日程枠は既に満席です
[失敗 #7] 190ms - この日程枠は既に満席です
[失敗 #8] 191ms - この日程枠は既に満席です
[失敗 #9] 192ms - この日程枠は既に満席です
[失敗 #10] 193ms - この日程枠は既に満席です
========================================
[事後状態] capacity: 5, booked_count: 5, status: closed
✅ 検証成功: 定員ちょうどで満席になりました
========================================
```

#### テスト方法2: 2タブで手動テスト

**実行手順:**
1. ブラウザで2つのタブを開く
2. 両タブで同じ日程枠の予約フォーム `/book/[slotId]` を開く（残席1の枠を推奨）
3. 両タブで予約フォームに入力（異なるメールアドレス）
4. 開発者ツールのコンソールを開いておく
5. ほぼ同時に「予約を確定する」ボタンをクリック

**確認ポイント:**
- ✅ 片方のタブは予約成功
- ✅ もう片方のタブは「この日程枠は既に満席です」エラー
- ✅ DB上の booked_count が capacity を超えない

#### テスト方法3: ブラウザコンソールでスクリプト実行

```javascript
// 開発者ツール > Console で実行
const slotId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // 対象の日程枠ID
const concurrency = 10; // 同時リクエスト数

const requests = Array.from({ length: concurrency }, (_, i) => {
  return fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slot_id: slotId,
      name: `同時テスト${i + 1}`,
      email: `concurrent-test-${i + 1}-${Date.now()}@example.com`,
      coach_name: `講師${i + 1}`,
      genre: 'テスト'
    })
  }).then(r => r.json())
});

Promise.all(requests).then(results => {
  const success = results.filter(r => !r.error).length;
  const failure = results.filter(r => r.error).length;
  console.log(`成功: ${success}件, 失敗: ${failure}件`);
  console.log('結果:', results);
});
```

#### ターミナルで確認すべきログ

ローカル開発環境（`npm run dev`）では以下のログが出力されます:

```
[API] Bookings POST: 予約作成開始 - slot_id: xxxxxxxx, email: concurrent-test-1@example.com
[API] Bookings POST: 予約作成開始 - slot_id: xxxxxxxx, email: concurrent-test-2@example.com
[API] Bookings POST: 予約作成開始 - slot_id: xxxxxxxx, email: concurrent-test-3@example.com
...
[API] Bookings POST: 予約作成成功 - booking_id: yyyyyyyy
[API] Bookings POST: 予約作成成功 - booking_id: zzzzzzzz
[API] Bookings POST: 予約失敗 - この日程枠は既に満席です
[API] Bookings POST: 予約失敗 - この日程枠は既に満席です
...
```

**重要なポイント:**
- ログに `slot_id`、`email` が記録される（個人情報は最小限）
- 成功時は `booking_id` が記録される
- 失敗時は失敗理由が明確に記録される
- ログから同時アクセスの挙動を追跡できる

#### データベースで確認

```sql
-- 最終状態を確認
SELECT id, starts_at, capacity, booked_count, status
FROM slots
WHERE id = 'テスト対象のslot_id';

-- 予約数を実際にカウント
SELECT slot_id, COUNT(*) as actual_booking_count
FROM bookings
WHERE slot_id = 'テスト対象のslot_id'
GROUP BY slot_id;

-- 両方の値が一致していることを確認
-- booked_count = actual_booking_count = capacity (満席の場合)
```

#### 期待される結果

**成功ケース（正常動作）:**
- 同時リクエスト10件のうち、5件だけが成功
- 残り5件は「この日程枠は既に満席です」エラー
- `booked_count` = 5（capacityと一致）
- `status` = 'closed'
- 実際の予約数も5件

**失敗ケース（バグ発生）:**
- ❌ booked_count が6以上になる（定員超過）
- ❌ status が 'open' のまま
- ❌ 実際の予約数が capacity を超える

#### 失敗時のトラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| booked_count が capacity を超える | RPC関数のロック処理が未実装 | `schema.sql` の `create_booking` 関数を確認、`FOR UPDATE` が含まれているか確認 |
| 6人目の予約が通る | トリガーが動作していない | `prevent_overbooking_trigger` を再作成 |
| status が closed にならない | auto_close_slot_trigger が未動作 | トリガーを再作成 |
| 全リクエストが成功する | RPC関数が呼ばれていない | API実装を確認、`supabase.rpc('create_booking', ...)` を使用しているか確認 |

#### RPC関数の動作確認

RPC関数が正しく実装されているか確認:

```sql
-- RPC関数の定義を確認
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'create_booking';

-- FOR UPDATE が含まれているか確認（重要）
-- prosrc 内に 'FOR UPDATE' という文字列が存在すること
```

期待される内容:
```sql
SELECT id, capacity, booked_count, status INTO v_slot
FROM slots
WHERE id = p_slot_id
FOR UPDATE;  -- ← これが row-level locking の核心
```

#### テストの自動化

このテストを定期的に実行するために、以下のスクリプトを使用できます:

**Node.jsスクリプト（作成予定）:**
```bash
# scripts/test-concurrent.js として作成し、以下のコマンドで実行
# node scripts/test-concurrent.js --api-url http://localhost:3000 --slot-id xxxxx
```

現時点では `scripts/test-concurrent-booking.html` を手動で実行してください。

---

## よくある問題と解決方法

### 問題1: RPC関数が見つからない

**エラー:**
```
[API Error] /api/bookings RPC
Error: function create_booking() does not exist
```

**解決方法:**
```sql
-- Supabaseダッシュボード > SQL Editor で実行
-- lib/supabase/schema.sql の RPC関数部分をコピーして実行
```

### 問題2: トリガーが動作しない

**症状:** `booked_count` が増えない、`status` が変わらない

**解決方法:**
```sql
-- トリガーの存在確認
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('bookings', 'slots');

-- トリガーが存在しない場合は schema.sql のトリガー部分を再実行
```

### 問題3: Googleカレンダー連携が常に失敗する

**確認手順:**
1. 環境変数が正しく設定されているか
   ```bash
   npm run check-env
   ```
2. サービスアカウントがカレンダーに共有されているか
3. プライベートキーの改行文字 `\n` が正しく含まれているか

---

## 全シナリオ自動実行チェックリスト

すべてのシナリオを順番に実行する場合の完全なチェックリスト:

- [ ] **環境準備**
  - [ ] `.env.local` 作成・設定
  - [ ] `npm install` 実行
  - [ ] Supabase スキーマ実行
  - [ ] `npm run check-env` でチェック

- [ ] **シナリオ1: 日程枠作成**
  - [ ] 管理画面ログイン成功
  - [ ] 日程枠作成成功
  - [ ] ログ確認
  - [ ] DB確認

- [ ] **シナリオ2: 日程枠表示**
  - [ ] トップページに表示
  - [ ] 残席数正しい
  - [ ] Network タブで API確認

- [ ] **シナリオ3: 予約作成**
  - [ ] 予約フォーム入力
  - [ ] 予約完了ページ表示
  - [ ] ログ確認
  - [ ] DB確認

- [ ] **シナリオ4: booked_count 更新**
  - [ ] 管理画面で予約数確認
  - [ ] トップページで残席確認
  - [ ] DB で booked_count 確認

- [ ] **シナリオ5: 満席処理**
  - [ ] 5人分の予約作成
  - [ ] 満席表示確認
  - [ ] 予約ボタン無効化確認
  - [ ] 6人目予約失敗確認
  - [ ] DB で status='closed' 確認

- [ ] **シナリオ6: カレンダー連携**
  - [ ] 環境変数設定
  - [ ] 予約作成
  - [ ] カレンダー作成ログ確認
  - [ ] 招待メール受信確認
  - [ ] DB で calendar_status 確認

- [ ] **シナリオ7: 同時予約テスト**
  - [ ] `scripts/test-concurrent-booking.html` をブラウザで開く
  - [ ] テスト対象の日程枠を選択（空き5名）
  - [ ] 同時リクエスト10件実行
  - [ ] 成功5件、失敗5件を確認
  - [ ] booked_count が capacity を超えないことを確認
  - [ ] status が 'closed' になることを確認

---

## トラブルシューティング早見表

| 症状 | 確認箇所 | 解決方法 |
|------|---------|---------|
| npm run dev が失敗 | 環境変数 | `npm run check-env` を実行 |
| 管理画面にログインできない | ADMIN_TOKEN | `.env.local` を確認 |
| 日程枠が作成されない | Supabase接続 | URL/KEY を確認 |
| 予約が作成されない | RPC関数 | `schema.sql` を再実行 |
| booked_count が増えない | トリガー | `schema.sql` のトリガー部分を再実行 |
| 満席にならない | トリガー | `update_slot_status` トリガーを確認 |
| カレンダー連携が失敗 | Google認証 | サービスアカウントキーを確認 |
| 招待メールが届かない | カレンダー権限 | サービスアカウントの共有設定を確認 |
| 同時予約で定員超過 | RPC関数 | `FOR UPDATE` が実装されているか確認 |
| 同時予約テストで全件成功 | RPC呼び出し | API が RPC を使用しているか確認 |

---

## ダミーデータの使用方法

手動でシナリオを実行する代わりに、ダミーデータを一括投入して動作確認できます。

### テストデータの投入

**投入されるデータ:**
- 日程枠 5件
  - 明日 10:00-11:00（空き: 5/5）
  - 明日 14:00-15:00（空き: 2/5）← 予約3件
  - 明後日 10:00-11:00（満席: 0/5）← 予約5件
  - 3日後 15:00-16:00（空き: 4/5）← 予約1件
  - 1週間後 13:00-14:00（空き: 5/5）
- 予約 9件（test1@example.com ~ test9@example.com）

**実行手順:**
1. Supabaseダッシュボード > SQL Editor を開く
2. `scripts/seed-test-data.sql` の内容をコピー
3. 貼り付けて「Run」をクリック
4. 完了メッセージを確認

**確認方法:**
```bash
# ローカル環境で確認
npm run dev

# ブラウザで確認
# - http://localhost:3000 → 日程枠一覧が表示される
# - http://localhost:3000/admin → 予約状況が確認できる
```

### テストデータのクリア

**クリア方法:**
1. Supabaseダッシュボード > SQL Editor を開く
2. `scripts/clean-test-data.sql` の内容をコピー
3. 貼り付けて「Run」をクリック

**オプション:**
- **オプション1（デフォルト）:** テストメールアドレス（test@example.com）の予約のみ削除
- **オプション2:** 過去1時間以内に作成された日程枠を削除（コメント解除が必要）
- **オプション3:** すべてのデータを削除（開発環境リセット用・危険）

### ダミーデータを使った検証シナリオ

**シナリオ1: 各種状態の確認**
1. テストデータを投入
2. トップページで以下を確認:
   - 5件の日程枠が表示される
   - 空き枠、一部埋まった枠、満席枠が混在
3. 管理画面で予約者一覧を確認

**シナリオ2: 満席枠への予約試行**
1. テストデータを投入
2. 満席枠（明後日 10:00-11:00）の「予約する」ボタンが無効化されていることを確認
3. API経由で予約を試みる（開発者ツール）:
```javascript
const response = await fetch('/api/slots');
const slots = await response.json();
const fullSlot = slots.find(s => s.status === 'closed');

await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slot_id: fullSlot.id,
    name: 'テスト追加',
    email: 'test99@example.com',
    coach_name: '追加講師',
    genre: 'テスト'
  })
});
// 期待結果: { error: 'この日程枠は既に満席です' }
```

**シナリオ3: 部分的に埋まった枠への予約**
1. テストデータを投入
2. 空き2名の枠（明日 14:00-15:00）に予約
3. 管理画面で予約数が3→4に増えることを確認
4. トップページで残席が2→1に減ることを確認

**シナリオ4: CSVエクスポート**
1. テストデータを投入
2. 管理画面で「全予約をCSVエクスポート」をクリック
3. CSVファイルに9件の予約データが含まれることを確認
4. 特定日程枠の「CSV」ボタンでその枠のみエクスポート

**シナリオ5: データのクリーンアップ**
1. テストデータを投入
2. `scripts/clean-test-data.sql` を実行
3. トップページで日程枠は残るが、予約がクリアされることを確認
4. 管理画面でbooked_countが0にリセットされることを確認

---

## 次のステップ

すべてのシナリオが成功したら:

1. **本番デプロイ準備**
   - README.md の「Vercelへのデプロイ」セクションを参照
   - 環境変数を Vercel に設定

2. **運用開始**
   - README.md の「運用フロー」セクションを参照
   - 定期的なCSVエクスポートでバックアップ

3. **監視設定（推奨）**
   - Sentry導入で本番エラーを監視
   - Vercel Analyticsで利用状況を確認
