-- Guru Games 2026 · versi 2: satu ranting, banyak tim, satu tagihan.
-- Jalankan hanya untuk instalasi baru (pengguna belum pernah memasang versi lama).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  ranting TEXT NOT NULL,
  ranting_norm TEXT NOT NULL UNIQUE,
  contact TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','transfer')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','paid')),
  total_amount INTEGER NOT NULL DEFAULT 0,
  fees_snapshot TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id INTEGER NOT NULL REFERENCES registrations(id),
  category TEXT NOT NULL CHECK(category IN ('futsal','gobak','tarik_putra','tarik_putri')),
  participants TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (registration_id,category)
);
CREATE TABLE IF NOT EXISTS draw_states (
  category TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle','live','complete'))
);
CREATE TABLE IF NOT EXISTS draw_slots (
  category TEXT NOT NULL,
  draw_order INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(category, draw_order),
  UNIQUE(category, team_id)
);
CREATE TABLE IF NOT EXISTS match_winners (
  category TEXT NOT NULL,
  round INTEGER NOT NULL,
  match_no INTEGER NOT NULL,
  winner_team_id INTEGER NOT NULL,
  PRIMARY KEY(category, round, match_no)
);
CREATE TABLE IF NOT EXISTS match_details (
 category TEXT NOT NULL,
 round INTEGER NOT NULL,
 match_no INTEGER NOT NULL,
 day TEXT NOT NULL DEFAULT '',
 time TEXT NOT NULL DEFAULT '',
 field TEXT NOT NULL DEFAULT '',
 score_a TEXT NOT NULL DEFAULT '',
 score_b TEXT NOT NULL DEFAULT '',
 note TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(category, round, match_no)
);
CREATE INDEX IF NOT EXISTS teams_category_idx ON teams(category);
CREATE INDEX IF NOT EXISTS teams_registration_idx ON teams(registration_id);
INSERT OR IGNORE INTO draw_states(category,status) VALUES
  ('futsal','idle'),('gobak','idle'),('tarik_putra','idle'),('tarik_putri','idle');
