CREATE TABLE IF NOT EXISTS recovery_logs (
  id TEXT PRIMARY KEY,
  workout_date TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 720),
  completed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(workout_date, exercise_id)
);
CREATE INDEX IF NOT EXISTS recovery_logs_date_idx ON recovery_logs(workout_date);
CREATE INDEX IF NOT EXISTS recovery_logs_exercise_idx ON recovery_logs(exercise_id, workout_date);
