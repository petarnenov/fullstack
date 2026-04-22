-- Production auth cut-over: the access session now carries a bound
-- csrf_token (double-submit cookie value) + family_id (shared with the
-- refresh token family, so reuse-detection can kill both in one sweep)
-- + explicit expires_at (15min TTL — enforced in code, not at the DB).
ALTER TABLE user_session_tbl ADD COLUMN csrf_token VARCHAR(64);
ALTER TABLE user_session_tbl ADD COLUMN family_id  VARCHAR(64);
ALTER TABLE user_session_tbl ADD COLUMN expires_at TIMESTAMP;
