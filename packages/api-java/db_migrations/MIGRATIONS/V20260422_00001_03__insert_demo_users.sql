-- Demo users mirror the Node in-memory authRepository one-for-one so the
-- frontend's hardcoded autofill list keeps working after the cut-over.
INSERT INTO user_tbl (user_id,       email,              password,      full_name,       role,       tenant_id) VALUES
                     ('usr_admin',    'admin@amp.demo',    'admin123',    'Ada Lovelace',   'admin',    'amp-demo'),
                     ('usr_operator', 'operator@amp.demo', 'operator123', 'Ivana Petrova',  'operator', 'amp-demo'),
                     ('usr_analyst',  'analyst@amp.demo',  'analyst123',  'Grace Hopper',   'analyst',  'amp-demo');
