package com.amp.agent.auth;

import com.amp.model.RefreshTokenTbl;
import com.amp.model.UserSessionTbl;
import com.amp.model.UserTbl;
import com.amp.service.auth.IssuedSession;
import com.amp.util.hibernate.HibernateSessionFactory;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import com.amp.util.jsontransfer.DemoCredentialJTO;
import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class AuthProcess {
    private static final SecureRandom RNG = new SecureRandom();
    private static final Argon2 ARGON2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);
    private static final int ARGON2_ITERATIONS = 3;
    private static final int ARGON2_MEMORY_KB = 65536;
    private static final int ARGON2_PARALLELISM = 4;

    private static final long ACCESS_TTL_MS = 1L * 60 * 1000;            // 1 min
    private static final long REFRESH_TTL_MS = 5L * 60 * 1000;           // 5 min

    /**
     * Hand-picked demo credentials so the login page autofill keeps working
     * after the cut-over (the DB now stores argon2 hashes, not plaintext, so
     * we can't read the passwords back out). The seed migration inserts these
     * same plaintext strings; we re-hash them on first boot (see
     * {@link #ensureArgon2Hashes()}).
     */
    private static final Map<String, String> DEMO_PASSWORDS = Map.of(
            "admin@amp.demo",    "admin123",
            "operator@amp.demo", "operator123",
            "analyst@amp.demo",  "analyst123"
    );

    /**
     * Pre-computed argon2id hash used as a timing decoy when the email doesn't
     * match a known user. Without it, /login becomes a user-enumeration oracle:
     * verify() takes ~50ms, missing-user short-circuits in <1ms. The hash is
     * checked-and-discarded; the salt baked into it is meaningless.
     */
    private static final String DUMMY_HASH =
            "$argon2id$v=19$m=65536,t=3,p=4$dXNlcmVudW1lcmF0aW9uZGVjb3k$" +
            "OgQsSsXu4iiCkbNVv1ZNgqVNAQZQrR7drNAKu7FzMtQ";

    private AuthProcess() {}

    /**
     * One-shot: rehash any seeded plaintext passwords into argon2id so the DB
     * never carries plaintext past the first request. Idempotent — detects
     * argon2 by prefix and skips users already hashed.
     */
    public static synchronized void ensureArgon2Hashes() {
        Session session = HibernateSessionFactory.getSession();
        Transaction tx = session.beginTransaction();
        try {
            List<UserTbl> users = session.createQuery("from UserTbl", UserTbl.class).list();
            boolean anyUpdated = false;
            for (UserTbl u : users) {
                if (u.getPassword() != null && u.getPassword().startsWith("$argon2")) continue;
                String hash = ARGON2.hash(ARGON2_ITERATIONS, ARGON2_MEMORY_KB, ARGON2_PARALLELISM,
                        u.getPassword().toCharArray());
                u.setPassword(hash);
                session.update(u);
                anyUpdated = true;
            }
            tx.commit();
            if (anyUpdated) {
                session.clear();
            }
        } catch (RuntimeException e) {
            if (tx.isActive()) tx.rollback();
            throw e;
        } finally {
            HibernateSessionFactory.closeSession();
        }
    }

    /**
     * Returns {@code null} on bad credentials — the caller maps that to 401.
     * Always runs an argon2 verify (real or dummy) so timing can't distinguish
     * "unknown email" from "wrong password".
     */
    public static IssuedSession login(String email, String password) {
        if (email == null || password == null) return null;
        Session session = HibernateSessionFactory.getSession();
        Transaction tx = session.beginTransaction();
        try {
            UserTbl user = session
                    .createQuery("from UserTbl where lower(email) = :email", UserTbl.class)
                    .setParameter("email", email.toLowerCase())
                    .uniqueResult();

            if (user == null) {
                // timing decoy — verify against a dummy hash so the caller can't
                // distinguish "no such user" from "bad password" by latency.
                try { ARGON2.verify(DUMMY_HASH, password.toCharArray()); } catch (Exception ignored) {}
                tx.rollback();
                return null;
            }
            boolean ok;
            try { ok = ARGON2.verify(user.getPassword(), password.toCharArray()); }
            catch (Exception e) { ok = false; }
            if (!ok) {
                tx.rollback();
                return null;
            }
            IssuedSession issued = issueSessionInternal(session, user.getUserId(), null);
            tx.commit();
            return issued;
        } catch (RuntimeException e) {
            if (tx.isActive()) tx.rollback();
            throw e;
        }
    }

    /**
     * Consumes the presented refresh token and issues a fresh session bound
     * to the same family. On replay of an already-rotated (or revoked) refresh
     * token we treat the family as compromised and delete every access +
     * refresh token that shares its family id.
     */
    public static IssuedSession rotate(String refreshToken) {
        if (refreshToken == null) return null;
        Session session = HibernateSessionFactory.getSession();
        Transaction tx = session.beginTransaction();
        try {
            RefreshTokenTbl record = session.get(RefreshTokenTbl.class, refreshToken);
            if (record == null) {
                tx.rollback();
                return null;
            }
            if (record.isRevoked()) {
                killFamily(session, record.getFamilyId());
                tx.commit();
                return null;
            }
            if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
                session.delete(record);
                tx.commit();
                return null;
            }
            record.setRevoked(true);
            session.update(record);
            IssuedSession issued = issueSessionInternal(session, record.getUserId(), record.getFamilyId());
            tx.commit();
            return issued;
        } catch (RuntimeException e) {
            if (tx.isActive()) tx.rollback();
            throw e;
        }
    }

    /** Explicit logout — kills the whole session family. */
    public static void revokeFamilyByRefreshToken(String refreshToken) {
        if (refreshToken == null) return;
        Session session = HibernateSessionFactory.getSession();
        Transaction tx = session.beginTransaction();
        try {
            RefreshTokenTbl record = session.get(RefreshTokenTbl.class, refreshToken);
            if (record != null) killFamily(session, record.getFamilyId());
            tx.commit();
        } catch (RuntimeException e) {
            if (tx.isActive()) tx.rollback();
            throw e;
        }
    }

    public static AuthenticatedUserJTO findUserByAccessToken(String accessToken) {
        return lookupSession(accessToken) == null ? null : lookupSession(accessToken).user;
    }

    /**
     * Returns the user + csrf token bound to the access session, or null if
     * the access token is unknown or expired.
     */
    public static SessionLookup lookupSession(String accessToken) {
        if (accessToken == null) return null;
        Session session = HibernateSessionFactory.getSession();
        UserSessionTbl s = session.get(UserSessionTbl.class, accessToken);
        if (s == null) return null;
        if (s.getExpiresAt() != null && s.getExpiresAt().isBefore(LocalDateTime.now())) {
            // Expired — sweep it so the table doesn't grow unboundedly.
            Transaction tx = session.beginTransaction();
            try { session.delete(s); tx.commit(); }
            catch (RuntimeException e) { if (tx.isActive()) tx.rollback(); }
            return null;
        }
        UserTbl user = session.get(UserTbl.class, s.getUserId());
        if (user == null) return null;
        return new SessionLookup(toUserJTO(user), s.getCsrfToken());
    }

    public static List<DemoCredentialJTO> listDemoCredentials() {
        Session session = HibernateSessionFactory.getSession();
        List<UserTbl> users = session
                .createQuery("from UserTbl order by role, email", UserTbl.class)
                .list();
        List<DemoCredentialJTO> out = new ArrayList<>();
        for (UserTbl u : users) {
            // The seeded plaintext is the autofill target — the hashed column
            // can't be reversed, but the canonical demo passwords are a
            // documented, fixed set, so we surface them from a known map.
            String pw = DEMO_PASSWORDS.getOrDefault(u.getEmail().toLowerCase(), "");
            if (pw.isEmpty()) continue;
            DemoCredentialJTO c = new DemoCredentialJTO();
            c.setEmail(u.getEmail());
            c.setPassword(pw);
            c.setRole(u.getRole().name());
            out.add(c);
        }
        return out;
    }

    // ---- internals -----------------------------------------------------------

    private static IssuedSession issueSessionInternal(Session session, String userId, String reuseFamilyId) {
        long now = System.currentTimeMillis();
        String accessToken = randomToken(24);
        String refreshToken = randomToken(32);
        String csrfToken = randomToken(16);
        String familyId = reuseFamilyId != null ? reuseFamilyId : randomToken(8);
        long accessExpiresAt = now + ACCESS_TTL_MS;
        long refreshExpiresAt = now + REFRESH_TTL_MS;

        UserSessionTbl access = new UserSessionTbl();
        access.setToken(accessToken);
        access.setUserId(userId);
        access.setCsrfToken(csrfToken);
        access.setFamilyId(familyId);
        access.setCreatedAt(LocalDateTime.now());
        access.setExpiresAt(LocalDateTime.now().plusSeconds(ACCESS_TTL_MS / 1000));
        session.save(access);

        RefreshTokenTbl refresh = new RefreshTokenTbl();
        refresh.setToken(refreshToken);
        refresh.setUserId(userId);
        refresh.setFamilyId(familyId);
        refresh.setExpiresAt(LocalDateTime.now().plusSeconds(REFRESH_TTL_MS / 1000));
        refresh.setRevoked(false);
        refresh.setCreatedAt(LocalDateTime.now());
        session.save(refresh);

        UserTbl user = session.get(UserTbl.class, userId);
        return new IssuedSession(accessToken, refreshToken, csrfToken,
                accessExpiresAt, refreshExpiresAt, toUserJTO(user));
    }

    private static void killFamily(Session session, String familyId) {
        session.createQuery("delete from RefreshTokenTbl where familyId = :f")
                .setParameter("f", familyId).executeUpdate();
        session.createQuery("delete from UserSessionTbl where familyId = :f")
                .setParameter("f", familyId).executeUpdate();
    }

    private static AuthenticatedUserJTO toUserJTO(UserTbl user) {
        AuthenticatedUserJTO jto = new AuthenticatedUserJTO();
        jto.setId(user.getUserId());
        jto.setEmail(user.getEmail());
        jto.setFullName(user.getFullName());
        jto.setRole(user.getRole().name());
        jto.setTenantId(user.getTenantId());
        return jto;
    }

    private static String randomToken(int bytes) {
        byte[] buf = new byte[bytes];
        RNG.nextBytes(buf);
        StringBuilder sb = new StringBuilder(buf.length * 2);
        for (byte b : buf) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    public static final class SessionLookup {
        public final AuthenticatedUserJTO user;
        public final String csrfToken;
        SessionLookup(AuthenticatedUserJTO user, String csrfToken) {
            this.user = user;
            this.csrfToken = csrfToken;
        }
    }
}
