-- ========================================
-- 講義時間調整機能のマイグレーション
-- duration_hours カラム追加（0.5〜10時間、30分単位で選択可能）
-- ========================================

-- 1. duration_hours カラム追加（デフォルト値1時間、小数対応）
ALTER TABLE slots ADD COLUMN duration_hours NUMERIC(3,1) NOT NULL DEFAULT 1;

-- 2. duration_hours のバリデーション制約（0.5〜10の範囲、0.5刻み）
ALTER TABLE slots ADD CONSTRAINT duration_hours_range
  CHECK (duration_hours >= 0.5 AND duration_hours <= 10 AND (duration_hours * 2) = FLOOR(duration_hours * 2));

-- 3. ends_at を通常カラムに変更（GENERATED制約を削除）
-- PostgreSQLでは GENERATED カラムを直接変更できないため、一度削除して再作成
ALTER TABLE slots DROP COLUMN ends_at;
ALTER TABLE slots ADD COLUMN ends_at TIMESTAMP WITH TIME ZONE;

-- 4. 既存データの ends_at を starts_at + duration_hours で復元
-- 既存データは duration_hours = 1 なので starts_at + 1時間
UPDATE slots SET ends_at = starts_at + INTERVAL '1 hour' * duration_hours;

-- 5. NOT NULL 制約追加
ALTER TABLE slots ALTER COLUMN ends_at SET NOT NULL;
