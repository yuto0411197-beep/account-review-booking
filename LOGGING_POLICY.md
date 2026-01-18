# ロギングポリシー

本番環境（Vercel）でのデバッグを効率化するため、アプリケーション全体で統一されたログ出力方針を定義します。

## ログレベルの定義

| レベル | 用途 | 例 |
|--------|------|-----|
| `console.log()` | 正常系の処理フロー、成功イベント | API呼び出し開始、予約作成成功、カレンダー作成成功 |
| `console.warn()` | 警告、リトライ可能なエラー、非推奨機能の使用 | バリデーション失敗、枠の二重予約検知、カレンダー連携無効 |
| `console.error()` | システムエラー、予期しないエラー | DB接続失敗、API呼び出し失敗、例外発生 |

## 重要API別のログ方針

### 1. 日程枠作成API (`/api/slots` POST)

**目的:** 管理者が日程枠を作成する際のトレーサビリティを確保

**必須ログ項目:**
```typescript
// リクエスト開始
console.log('[API] Slots POST: 枠作成開始', {
  starts_at: starts_at,
  ends_at: ends_at,
  capacity: capacity,
  timestamp: new Date().toISOString()
});

// 成功
console.log('[API] Slots POST: 枠作成成功', {
  slot_id: data.id,
  starts_at: data.starts_at,
  capacity: data.capacity
});

// 失敗
console.error('[API] Slots POST: 枠作成失敗', {
  error_code: error.code,
  error_message: error.message,
  input_data: { starts_at, ends_at, capacity }
});
```

**ログ出力タイミング:**
- リクエスト受信時
- バリデーション失敗時（warn）
- DB挿入成功時
- エラー発生時（error）

**注意事項:**
- 認証トークンは絶対にログに出力しない
- タイムスタンプは必ずISO 8601形式

---

### 2. 予約作成API (`/api/bookings` POST)

**目的:** ユーザーの予約処理全体を追跡し、失敗原因を特定可能にする

**必須ログ項目:**
```typescript
// リクエスト開始
console.log('[API] Bookings POST: 予約作成開始', {
  slot_id: slot_id,
  email: email,
  coach_name: coach_name,
  genre: genre,
  has_prework_url: !!prework_url,
  timestamp: new Date().toISOString()
});

// RPC呼び出し開始
console.log('[API] Bookings POST: RPC create_booking 呼び出し', {
  slot_id: slot_id
});

// RPC成功
console.log('[API] Bookings POST: 予約作成成功', {
  booking_id: result.booking_id,
  slot_id: result.slot_id,
  email: email
});

// カレンダー連携開始
console.log('[API] Bookings POST: Googleカレンダー連携開始', {
  booking_id: result.booking_id,
  calendar_enabled: isCalendarEnabled()
});

// カレンダー作成成功
console.log('[API] Bookings POST: カレンダー作成成功', {
  booking_id: result.booking_id,
  event_id: calendarEventId
});

// カレンダー作成失敗（エラーではなく警告）
console.warn('[API] Bookings POST: カレンダー作成失敗（予約は成功）', {
  booking_id: result.booking_id,
  error_type: calendarResult.error_type,
  error_message: calendarResult.error
});

// 予約失敗
console.error('[API] Bookings POST: 予約失敗', {
  error_type: 'booking_failed',
  error_message: result.message,
  slot_id: slot_id,
  email: email
});
```

**ログ出力タイミング:**
- リクエスト受信時
- RPC呼び出し前
- RPC成功時
- カレンダー連携開始時
- カレンダー成功/失敗時（warn/log）
- 予約失敗時（error）
- 例外発生時（error）

**注意事項:**
- メールアドレスは必要最小限のみ出力（フルアドレスOK、パスワード等は絶対NG）
- prework_urlの値は出力しない（存在有無のみ）
- 予約成功時は必ずbooking_idを出力

---

### 3. Googleカレンダー作成 (`lib/google-calendar.ts`)

**目的:** カレンダーAPI呼び出しの詳細を追跡し、外部API障害を切り分ける

**必須ログ項目:**
```typescript
// 初期化
console.log('[Calendar] サービスアカウント初期化', {
  service_account: serviceAccountEmail.substring(0, 20) + '...',
  calendar_id: calendarId.substring(0, 20) + '...'
});

// イベント作成開始
console.log('[Calendar] イベント作成開始', {
  attendee: email,
  slot_starts_at: slot.starts_at,
  coach_name: coach_name
});

// attendees追加
console.log('[Calendar] attendees に追加', {
  email: email,
  display_name: name
});

// 成功
console.log('[Calendar] イベント作成成功', {
  event_id: response.data.id,
  event_link: response.data.htmlLink,
  processing_time_ms: duration,
  attendee: email
});

// 失敗
console.error('[Calendar Error] カレンダー作成失敗', {
  error_type: errorInfo.type,
  error_message: errorInfo.message,
  error_details: errorInfo.details,
  processing_time_ms: duration,
  attendee: email
});
```

**ログ出力タイミング:**
- クライアント初期化時
- イベント作成開始時
- attendees追加時
- API呼び出し成功時
- API呼び出し失敗時（詳細なエラー分類）

**注意事項:**
- サービスアカウントメールとカレンダーIDは先頭20文字のみ
- GOOGLE_PRIVATE_KEYは絶対にログに出力しない
- 処理時間（ms）を必ず記録してパフォーマンス監視
- エラータイプ（auth/permission/not_found等）を必ず出力

---

## 個人情報保護方針

### 出力して良い情報
- ✅ メールアドレス（予約者、主催者）
- ✅ 名前（予約者、講師）
- ✅ ジャンル、コーチ名
- ✅ タイムスタンプ（ISO 8601形式）
- ✅ ID（booking_id, slot_id, event_id）
- ✅ URLの存在有無（`has_prework_url: true`）

### 出力してはいけない情報
- ❌ 認証トークン（ADMIN_TOKEN, API_KEY）
- ❌ 秘密鍵（GOOGLE_PRIVATE_KEY）
- ❌ prework_urlの実際のURL
- ❌ パスワード（将来実装する場合）
- ❌ セッションID、Cookie値

### 部分的にマスクして出力する情報
- 🔸 サービスアカウントメール: 先頭20文字 + `...`
- 🔸 カレンダーID: 先頭20文字 + `...`

## Vercel Function Logsでの確認方法

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Deployments」タブを開く
4. 最新のデプロイメントをクリック
5. 「Functions」タブを開く
6. 該当する関数（route.ts）をクリック
7. ログストリームでリアルタイム確認

**フィルタリング方法:**
- `[API] Bookings POST:` で予約APIのログのみ表示
- `[Calendar]` でカレンダー関連ログのみ表示
- `[API] Slots POST:` で枠作成ログのみ表示

## エラー発生時のログ読み方

### 例1: 予約作成は成功したがカレンダー作成に失敗
```
[API] Bookings POST: 予約作成開始 - slot_id: 123, email: user@example.com
[API] Bookings POST: RPC create_booking 呼び出し
[API] Bookings POST: 予約作成成功 - booking_id: 456
[API] Bookings POST: Googleカレンダー連携開始
[Calendar] イベント作成開始 - attendee: user@example.com
[Calendar Error] カレンダー作成失敗 - error_type: permission
[API] Bookings POST: カレンダー作成失敗
```

**診断:** booking_id: 456 は作成されているが、カレンダーのpermissionエラー。サービスアカウントの共有設定を確認。

### 例2: 予約作成自体が失敗（満席）
```
[API] Bookings POST: 予約作成開始 - slot_id: 123, email: user@example.com
[API] Bookings POST: RPC create_booking 呼び出し
[API] Bookings POST: 予約失敗 - この日程枠は既に予約済みです
```

**診断:** RPC内で満席検知。ユーザーには適切なエラーメッセージが返されている。

### 例3: 認証エラー
```
[Calendar] サービスアカウント初期化 - service_account: account-review@proj...
[Calendar] イベント作成開始 - attendee: user@example.com
[Calendar Error] カレンダー作成失敗 - error_type: auth
```

**診断:** サービスアカウントの認証情報が無効。GOOGLE_PRIVATE_KEYの改行文字を確認。

## ログローテーションとコスト

- Vercel無料プランではログは24時間保持
- Pro/Teamプランでは最大14日間保持
- 重要なエラーはSentry等の外部サービスに転送することを推奨（後述）

## 今後の改善案

- [ ] 構造化ログ（JSON形式）への移行
- [ ] correlation IDの導入（1リクエスト全体を追跡）
- [ ] Sentry等のエラートラッキングサービス導入
- [ ] パフォーマンスメトリクス（処理時間）の集計
