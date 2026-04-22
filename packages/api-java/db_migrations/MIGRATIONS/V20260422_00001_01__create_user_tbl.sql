CREATE TABLE user_tbl (
    user_id    VARCHAR(64)  PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    full_name  VARCHAR(255) NOT NULL,
    role       VARCHAR(32)  NOT NULL,
    tenant_id  VARCHAR(64)  NOT NULL
);
