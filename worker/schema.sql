-- Database schema untuk aplikasi pindahan
CREATE TABLE IF NOT EXISTS boxes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indeks untuk mempercepat pencarian
CREATE INDEX IF NOT EXISTS idx_boxes_id ON boxes(id);