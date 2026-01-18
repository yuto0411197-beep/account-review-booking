-- ============================================
-- テストデータクリアスクリプト
-- ============================================
-- 用途: 開発環境のテストデータを削除
-- 実行方法: Supabaseダッシュボード > SQL Editor で実行
-- 注意: 本番環境では慎重に実行すること
-- ============================================

-- ============================================
-- オプション1: テストメールアドレスのみ削除
-- ============================================
-- test@example.com のメールアドレスで作成された予約のみを削除
-- 日程枠は残る（booked_count は自動的に減る）

DELETE FROM bookings
WHERE email LIKE 'test%@example.com';

-- 削除結果を表示
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ テスト予約を % 件削除しました', deleted_count;
END $$;

-- ============================================
-- オプション2: 過去1時間以内に作成された日程枠を削除
-- ============================================
-- シードスクリプトで作成した直後の日程枠を削除
-- 予約データも CASCADE で自動削除される

-- DELETE FROM slots
-- WHERE created_at > NOW() - INTERVAL '1 hour';

-- ============================================
-- オプション3: すべてのデータを削除（危険）
-- ============================================
-- 開発環境をリセットする場合のみ使用
-- 本番環境では絶対に実行しないこと

-- TRUNCATE TABLE bookings CASCADE;
-- TRUNCATE TABLE slots CASCADE;

-- ============================================
-- 確認クエリ
-- ============================================

-- 残っている日程枠を確認
SELECT
  id,
  TO_CHAR(starts_at, 'YYYY-MM-DD HH24:MI') as 開始日時,
  capacity as 定員,
  booked_count as 予約数,
  status as 状態
FROM slots
WHERE starts_at >= NOW()
ORDER BY starts_at;

-- 残っている予約を確認
SELECT
  b.name as 予約者名,
  b.email as メールアドレス,
  TO_CHAR(s.starts_at, 'YYYY-MM-DD HH24:MI') as 日時
FROM bookings b
JOIN slots s ON b.slot_id = s.id
WHERE s.starts_at >= NOW()
ORDER BY s.starts_at, b.created_at;

-- サマリー表示
SELECT
  '残り日程枠数' as 項目,
  COUNT(*)::text as 値
FROM slots
WHERE starts_at >= NOW()

UNION ALL

SELECT
  '残り予約数' as 項目,
  COUNT(*)::text as 値
FROM bookings b
JOIN slots s ON b.slot_id = s.id
WHERE s.starts_at >= NOW();

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ テストデータのクリアが完了しました';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  - 必要に応じて seed-test-data.sql を再実行';
  RAISE NOTICE '  - または本番データの入力を開始';
END $$;
