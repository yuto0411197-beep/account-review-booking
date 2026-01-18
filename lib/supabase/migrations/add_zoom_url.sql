-- Zoom URLフィールドをslotsテーブルに追加

ALTER TABLE slots ADD COLUMN IF NOT EXISTS zoom_url TEXT;

COMMENT ON COLUMN slots.zoom_url IS 'オンライン会議のZoom URL';
