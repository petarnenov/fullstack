-- Refresh tokens live in their own table so the reuse-detection sweep
-- (on replay after rotation) can wipe the whole family in one UPDATE.
-- A family shares its id with every access + refresh token ever issued
-- from the same login; the first replay of a rotated token is treated
-- as compromise and kills the family root-and-branch.
CREATE TABLE refresh_token_tbl (
    token       VARCHAR(128) PRIMARY KEY,
    user_id     VARCHAR(64)  NOT NULL,
    family_id   VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES user_tbl (user_id) ON DELETE CASCADE
);
CREATE INDEX idx_refresh_token_family ON refresh_token_tbl (family_id);
