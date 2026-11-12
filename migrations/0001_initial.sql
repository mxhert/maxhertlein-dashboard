CREATE TABLE IF NOT EXISTS app_config (id INTEGER PRIMARY KEY CHECK (id = 1), pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY CHECK (id = 1), plan_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workout_logs (id TEXT PRIMARY KEY, workout_date TEXT NOT NULL, exercise_id TEXT NOT NULL, exercise_name TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('strength','run')), target_weight REAL, target_reps INTEGER, sets INTEGER, actual_reps INTEGER, completed INTEGER NOT NULL DEFAULT 1, distance REAL, duration_seconds INTEGER, created_at TEXT NOT NULL, UNIQUE(workout_date, exercise_id));
CREATE INDEX IF NOT EXISTS workout_logs_date_idx ON workout_logs(workout_date);
CREATE INDEX IF NOT EXISTS workout_logs_exercise_idx ON workout_logs(exercise_id, workout_date);
CREATE TABLE IF NOT EXISTS auth_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ip_hash TEXT NOT NULL, attempted_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_attempts_ip_idx ON auth_attempts(ip_hash, attempted_at);