CREATE TABLE IF NOT EXISTS user_sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (sid);

CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions (expire);