CREATE TABLE user_session_tbl (
    token       VARCHAR(128) PRIMARY KEY,
    user_id     VARCHAR(64)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_session_user FOREIGN KEY (user_id) REFERENCES user_tbl (user_id) ON DELETE CASCADE
);
