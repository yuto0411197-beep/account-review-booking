-- ============================================
-- テストデータ投入スクリプト
-- ============================================
-- 用途: 開発環境での動作確認用のダミーデータを作成
-- 実行方法: Supabaseダッシュボード > SQL Editor で実行
-- 注意: 本番環境では実行しないこと
-- ============================================

-- 既存のテストデータを削除（オプション）
-- DELETE FROM bookings WHERE email LIKE 'test%@example.com';
-- DELETE FROM slots WHERE created_at > NOW() - INTERVAL '1 hour';

-- ============================================
-- 1. 日程枠の作成（5件）
-- ============================================

-- 日程枠1: 明日 10:00-11:00（空き: 5/5）
INSERT INTO slots (starts_at, capacity, status)
VALUES (
  (NOW() + INTERVAL '1 day')::date + TIME '10:00:00',
  5,
  'open'
);

-- 日程枠2: 明日 14:00-15:00（空き: 2/5）予約3件作成予定
INSERT INTO slots (starts_at, capacity, status)
VALUES (
  (NOW() + INTERVAL '1 day')::date + TIME '14:00:00',
  5,
  'open'
);

-- 日程枠3: 明後日 10:00-11:00（満席: 0/5）予約5件作成予定
INSERT INTO slots (starts_at, capacity, status)
VALUES (
  (NOW() + INTERVAL '2 days')::date + TIME '10:00:00',
  5,
  'open'
);

-- 日程枠4: 3日後 15:00-16:00（空き: 4/5）予約1件作成予定
INSERT INTO slots (starts_at, capacity, status)
VALUES (
  (NOW() + INTERVAL '3 days')::date + TIME '15:00:00',
  5,
  'open'
);

-- 日程枠5: 1週間後 13:00-14:00（空き: 5/5）
INSERT INTO slots (starts_at, capacity, status)
VALUES (
  (NOW() + INTERVAL '7 days')::date + TIME '13:00:00',
  5,
  'open'
);

-- ============================================
-- 2. 予約データの作成
-- ============================================

-- 日程枠2に3件の予約を作成（空き: 2/5）
DO $$
DECLARE
  slot2_id UUID;
BEGIN
  -- 日程枠2のIDを取得
  SELECT id INTO slot2_id
  FROM slots
  WHERE starts_at = (NOW() + INTERVAL '1 day')::date + TIME '14:00:00'
  LIMIT 1;

  -- 予約1
  INSERT INTO bookings (slot_id, name, email, coach_name, genre, prework_url)
  VALUES (
    slot2_id,
    'テスト太郎',
    'test1@example.com',
    '山田太郎',
    'ビジネス',
    'https://docs.google.com/spreadsheets/d/sample1'
  );

  -- 予約2
  INSERT INTO bookings (slot_id, name, email, coach_name, genre, prework_url)
  VALUES (
    slot2_id,
    'テスト花子',
    'test2@example.com',
    '田中花子',
    'エンタメ',
    'https://docs.google.com/spreadsheets/d/sample2'
  );

  -- 予約3
  INSERT INTO bookings (slot_id, name, email, coach_name, genre)
  VALUES (
    slot2_id,
    'テスト次郎',
    'test3@example.com',
    '佐藤次郎',
    '教育'
  );
END $$;

-- 日程枠3に5件の予約を作成（満席）
DO $$
DECLARE
  slot3_id UUID;
BEGIN
  -- 日程枠3のIDを取得
  SELECT id INTO slot3_id
  FROM slots
  WHERE starts_at = (NOW() + INTERVAL '2 days')::date + TIME '10:00:00'
  LIMIT 1;

  -- 予約1
  INSERT INTO bookings (slot_id, name, email, coach_name, genre, prework_url)
  VALUES (
    slot3_id,
    '鈴木一郎',
    'test4@example.com',
    '高橋一郎',
    'ビジネス',
    'https://docs.google.com/spreadsheets/d/sample3'
  );

  -- 予約2
  INSERT INTO bookings (slot_id, name, email, coach_name, genre)
  VALUES (
    slot3_id,
    '伊藤二郎',
    'test5@example.com',
    '渡辺二郎',
    'エンタメ'
  );

  -- 予約3
  INSERT INTO bookings (slot_id, name, email, coach_name, genre)
  VALUES (
    slot3_id,
    '中村三郎',
    'test6@example.com',
    '小林三郎',
    '教育'
  );

  -- 予約4
  INSERT INTO bookings (slot_id, name, email, coach_name, genre)
  VALUES (
    slot3_id,
    '加藤四郎',
    'test7@example.com',
    '吉田四郎',
    'ビジネス'
  );

  -- 予約5（満席）
  INSERT INTO bookings (slot_id, name, email, coach_name, genre)
  VALUES (
    slot3_id,
    '山本五郎',
    'test8@example.com',
    '松本五郎',
    'エンタメ'
  );
END $$;

-- 日程枠4に1件の予約を作成（空き: 4/5）
DO $$
DECLARE
  slot4_id UUID;
BEGIN
  -- 日程枠4のIDを取得
  SELECT id INTO slot4_id
  FROM slots
  WHERE starts_at = (NOW() + INTERVAL '3 days')::date + TIME '15:00:00'
  LIMIT 1;

  -- 予約1
  INSERT INTO bookings (slot_id, name, email, coach_name, genre, prework_url)
  VALUES (
    slot4_id,
    '林六郎',
    'test9@example.com',
    '木村六郎',
    '教育',
    'https://docs.google.com/spreadsheets/d/sample4'
  );
END $$;

-- ============================================
-- 3. 確認クエリ
-- ============================================

-- 作成した日程枠を確認
SELECT
  id,
  TO_CHAR(starts_at, 'YYYY-MM-DD HH24:MI') as 開始日時,
  TO_CHAR(ends_at, 'HH24:MI') as 終了時刻,
  capacity as 定員,
  booked_count as 予約数,
  (capacity - booked_count) as 残席,
  status as 状態
FROM slots
WHERE starts_at >= NOW()
ORDER BY starts_at;

-- 作成した予約を確認
SELECT
  b.name as 予約者名,
  b.email as メールアドレス,
  b.coach_name as 講師名,
  b.genre as ジャンル,
  TO_CHAR(s.starts_at, 'YYYY-MM-DD HH24:MI') as 日時,
  b.calendar_status as カレンダー状態
FROM bookings b
JOIN slots s ON b.slot_id = s.id
WHERE b.email LIKE 'test%@example.com'
ORDER BY s.starts_at, b.created_at;

-- サマリー表示
SELECT
  '合計日程枠数' as 項目,
  COUNT(*)::text as 値
FROM slots
WHERE starts_at >= NOW()

UNION ALL

SELECT
  '合計予約数' as 項目,
  COUNT(*)::text as 値
FROM bookings b
JOIN slots s ON b.slot_id = s.id
WHERE s.starts_at >= NOW()
  AND b.email LIKE 'test%@example.com'

UNION ALL

SELECT
  '空き枠数' as 項目,
  COUNT(*)::text as 値
FROM slots
WHERE starts_at >= NOW()
  AND status = 'open'

UNION ALL

SELECT
  '満席枠数' as 項目,
  COUNT(*)::text as 値
FROM slots
WHERE starts_at >= NOW()
  AND status = 'closed';

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ テストデータの投入が完了しました';
  RAISE NOTICE '';
  RAISE NOTICE '作成された日程枠:';
  RAISE NOTICE '  1. 明日 10:00-11:00 (空き: 5/5)';
  RAISE NOTICE '  2. 明日 14:00-15:00 (空き: 2/5) ← 予約3件';
  RAISE NOTICE '  3. 明後日 10:00-11:00 (満席: 0/5) ← 予約5件';
  RAISE NOTICE '  4. 3日後 15:00-16:00 (空き: 4/5) ← 予約1件';
  RAISE NOTICE '  5. 1週間後 13:00-14:00 (空き: 5/5)';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  - http://localhost:3000 で日程枠を確認';
  RAISE NOTICE '  - http://localhost:3000/admin で予約状況を確認';
END $$;
