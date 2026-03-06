CREATE TABLE IF NOT EXISTS llm_calls (
  request_id       TEXT PRIMARY KEY,
  timestamp_request TEXT NOT NULL,
  model            TEXT NOT NULL,
  messages         TEXT NOT NULL,
  extra_params     TEXT,
  success          INTEGER NOT NULL,
  timestamp_response TEXT,
  latency_ms       REAL,
  response_message TEXT,
  usage            TEXT,
  finish_reason    TEXT,
  error_type       TEXT,
  error_message    TEXT,
  status_code      INTEGER,
  source           TEXT
);
