-- 成績表：單關成績與「連續挑戰」總成績共用同一張表
-- mode     : 'level' 單關 / 'run' 連續挑戰（打完 4 關）
-- level_id : 單關為 1~4；連續挑戰固定為 0（避免 NULL，方便建索引）
-- perfect  : 1 = 單關拿 3 星 / 連續挑戰 4 關都 3 星（計時賽資格）
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname   TEXT    NOT NULL,
  mode       TEXT    NOT NULL CHECK (mode IN ('level', 'run')),
  level_id   INTEGER NOT NULL CHECK (level_id BETWEEN 0 AND 99),
  points     INTEGER NOT NULL CHECK (points >= 0),
  seconds    REAL    NOT NULL CHECK (seconds > 0),
  perfect    INTEGER NOT NULL DEFAULT 0 CHECK (perfect IN (0, 1)),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 積分賽：同榜內依積分高到低、用時短到長
CREATE INDEX IF NOT EXISTS idx_scores_points
  ON scores (mode, level_id, points DESC, seconds ASC);

-- 計時賽：只看 perfect = 1，依用時短到長
CREATE INDEX IF NOT EXISTS idx_scores_time
  ON scores (mode, level_id, perfect, seconds ASC);

-- 老師後台：依時間倒序瀏覽
CREATE INDEX IF NOT EXISTS idx_scores_created
  ON scores (created_at DESC);
