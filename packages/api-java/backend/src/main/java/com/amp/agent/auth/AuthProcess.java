package com.amp.agent.auth;

import com.amp.model.UserSessionTbl;
import com.amp.model.UserTbl;
import com.amp.util.hibernate.HibernateSessionFactory;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import com.amp.util.jsontransfer.DemoCredentialJTO;
import com.amp.util.jsontransfer.LoginResponseJTO;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AuthProcess {
    private static final SecureRandom RNG = new SecureRandom();

    private AuthProcess() {}

    public static LoginResponseJTO login(String email, String password) {
        if (email == null || password == null) return null;
        Session session = HibernateSessionFactory.getSession();
        Transaction tx = session.beginTransaction();
        try {
            UserTbl user = session
                    .createQuery("from UserTbl where lower(email) = :email", UserTbl.class)
                    .setParameter("email", email.toLowerCase())
                    .uniqueResult();

            if (user == null || !user.getPassword().equals(password)) {
                tx.rollback();
                return null;
            }

            UserSessionTbl s = new UserSessionTbl();
            s.setToken(newOpaqueToken());
            s.setUserId(user.getUserId());
            s.setCreatedAt(LocalDateTime.now());
            session.save(s);
            tx.commit();

            LoginResponseJTO res = new LoginResponseJTO();
            res.setToken(s.getToken());
            res.setUser(toUserJTO(user));
            return res;
        } catch (RuntimeException e) {
            if (tx.isActive()) tx.rollback();
            throw e;
        }
    }

    public static void logout(String token) {
        if (token == null) return;
        Session session = HibernateSessionFactory.getSession();
        Transaction tx = session.beginTransaction();
        try {
            UserSessionTbl s = session.get(UserSessionTbl.class, token);
            if (s != null) session.delete(s);
            tx.commit();
        } catch (RuntimeException e) {
            if (tx.isActive()) tx.rollback();
            throw e;
        }
    }

    public static AuthenticatedUserJTO findUserByToken(String token) {
        if (token == null) return null;
        Session session = HibernateSessionFactory.getSession();
        UserSessionTbl s = session.get(UserSessionTbl.class, token);
        if (s == null) return null;
        UserTbl user = session.get(UserTbl.class, s.getUserId());
        return user == null ? null : toUserJTO(user);
    }

    public static List<DemoCredentialJTO> listDemoCredentials() {
        Session session = HibernateSessionFactory.getSession();
        List<UserTbl> users = session
                .createQuery("from UserTbl order by role, email", UserTbl.class)
                .list();
        List<DemoCredentialJTO> out = new ArrayList<>();
        for (UserTbl u : users) {
            DemoCredentialJTO c = new DemoCredentialJTO();
            c.setEmail(u.getEmail());
            c.setPassword(u.getPassword());
            c.setRole(u.getRole().name());
            out.add(c);
        }
        return out;
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

    private static String newOpaqueToken() {
        byte[] buf = new byte[24];
        RNG.nextBytes(buf);
        StringBuilder sb = new StringBuilder(buf.length * 2);
        for (byte b : buf) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
