-- アカウント添削会の予約管理システム用スキーマ

-- ========================================
-- slots（日程枠）テーブル
-- ========================================
CREATE TABLE slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (starts_at + INTERVAL '1 hour') STORED,
  capacity INTEGER NOT NULL DEFAULT 5,
  booked_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- bookings（予約）テーブル
-- ========================================
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  coach_name VARCHAR(255) NOT NULL,
  genre VARCHAR(255) NOT NULL,
  prework_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calendar_event_id VARCHAR(255),
  calendar_status VARCHAR(50),
  CONSTRAINT unique_email_per_slot UNIQUE(slot_id, email)
);

-- ========================================
-- インデックス
-- ========================================
CREATE INDEX idx_slots_starts_at ON slots(starts_at);
CREATE INDEX idx_slots_status ON slots(status);
CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_bookings_email ON bookings(email);

-- ========================================
-- 予約数カウント更新トリガー関数
-- ========================================
CREATE OR REPLACE FUNCTION update_slot_booked_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 予約追加時
    UPDATE slots
    SET booked_count = booked_count + 1
    WHERE id = NEW.slot_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- 予約削除時
    UPDATE slots
    SET booked_count = booked_count - 1
    WHERE id = OLD.slot_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.slot_id != OLD.slot_id THEN
    -- 予約の枠を変更した場合（通常は発生しないが念のため）
    UPDATE slots
    SET booked_count = booked_count - 1
    WHERE id = OLD.slot_id;

    UPDATE slots
    SET booked_count = booked_count + 1
    WHERE id = NEW.slot_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booked_count_trigger
AFTER INSERT OR DELETE OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_slot_booked_count();

-- ========================================
-- 満席時の自動クローズトリガー関数
-- ========================================
CREATE OR REPLACE FUNCTION auto_close_slot_when_full()
RETURNS TRIGGER AS $$
BEGIN
  -- booked_count が capacity に達したら自動的に closed にする
  IF NEW.booked_count >= NEW.capacity THEN
    NEW.status = 'closed';
  -- capacity を増やして空きができた場合は open に戻す
  ELSIF NEW.booked_count < NEW.capacity AND OLD.status = 'closed' THEN
    NEW.status = 'open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_close_slot_trigger
BEFORE UPDATE OF booked_count, capacity ON slots
FOR EACH ROW
EXECUTE FUNCTION auto_close_slot_when_full();

-- ========================================
-- 定員超過防止チェック関数
-- ========================================
CREATE OR REPLACE FUNCTION prevent_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  current_slot RECORD;
BEGIN
  -- 予約対象の枠の情報を取得
  SELECT capacity, booked_count, status INTO current_slot
  FROM slots
  WHERE id = NEW.slot_id
  FOR UPDATE; -- 行ロックをかけて同時予約を防ぐ

  -- 既に満席の場合はエラー
  IF current_slot.booked_count >= current_slot.capacity THEN
    RAISE EXCEPTION 'この日程枠は既に満席です';
  END IF;

  -- statusがclosedの場合はエラー
  IF current_slot.status = 'closed' THEN
    RAISE EXCEPTION 'この日程枠は受付終了しています';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_overbooking_trigger
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_overbooking();

-- ========================================
-- 予約作成RPC関数（トランザクション処理）
-- ========================================
CREATE OR REPLACE FUNCTION create_booking(
  p_slot_id UUID,
  p_name VARCHAR,
  p_email VARCHAR,
  p_coach_name VARCHAR,
  p_genre VARCHAR,
  p_prework_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_slot RECORD;
  v_booking_id UUID;
  v_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1. 対象の slot をロックして取得
  SELECT id, capacity, booked_count, status INTO v_slot
  FROM slots
  WHERE id = p_slot_id
  FOR UPDATE;

  -- slot が存在しない場合
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', '日程枠が見つかりません'
    );
  END IF;

  -- 2. booked_count < capacity の場合のみ予約を作成
  IF v_slot.booked_count >= v_slot.capacity THEN
    RETURN json_build_object(
      'success', false,
      'message', 'この日程枠は既に満席です'
    );
  END IF;

  -- status が closed の場合
  IF v_slot.status = 'closed' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'この日程枠は受付終了しています'
    );
  END IF;

  -- 予約を作成（トリガーが自動的に booked_count を +1 する）
  INSERT INTO bookings (slot_id, name, email, coach_name, genre, prework_url)
  VALUES (p_slot_id, p_name, p_email, p_coach_name, p_genre, p_prework_url)
  RETURNING id, created_at INTO v_booking_id, v_created_at;

  -- 成功レスポンスを返す
  RETURN json_build_object(
    'success', true,
    'message', '予約が完了しました',
    'booking_id', v_booking_id,
    'slot_id', p_slot_id,
    'name', p_name,
    'email', p_email,
    'coach_name', p_coach_name,
    'genre', p_genre,
    'prework_url', p_prework_url,
    'created_at', v_created_at
  );

EXCEPTION
  -- 重複メールアドレスエラー（UNIQUE制約違反）
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'このメールアドレスで既に予約済みです'
    );

  -- その他のエラー
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- サンプルデータ（開発用）
-- ========================================
-- 2026年2月のサンプル日程枠を作成
-- INSERT INTO slots (starts_at, capacity) VALUES
--   ('2026-02-01 10:00:00+09', 5),
--   ('2026-02-01 14:00:00+09', 5),
--   ('2026-02-01 16:00:00+09', 3),
--   ('2026-02-02 10:00:00+09', 5),
--   ('2026-02-02 14:00:00+09', 5);
