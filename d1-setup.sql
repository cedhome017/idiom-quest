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

CREATE INDEX IF NOT EXISTS idx_scores_points
  ON scores (mode, level_id, points DESC, seconds ASC);

CREATE INDEX IF NOT EXISTS idx_scores_time
  ON scores (mode, level_id, perfect, seconds ASC);

CREATE INDEX IF NOT EXISTS idx_scores_created
  ON scores (created_at DESC);
