package com.amp.util.hibernate;

import org.flywaydb.core.Flyway;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.cfg.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class HibernateSessionFactory {
    private static final Logger log = LoggerFactory.getLogger(HibernateSessionFactory.class);
    private static final ThreadLocal<Session> threadLocal = new ThreadLocal<>();
    private static SessionFactory sessionFactory;

    private HibernateSessionFactory() {}

    public static synchronized void initialize() {
        if (sessionFactory == null) {
            try {
                Configuration configuration = new Configuration().configure("hibernate.cfg.xml");
                runFlywayMigrations(configuration);
                sessionFactory = configuration.buildSessionFactory();
                log.info("Hibernate SessionFactory initialized successfully.");
            } catch (Exception e) {
                log.error("Failed to initialize Hibernate SessionFactory", e);
                throw new RuntimeException(e);
            }
        }
    }

    private static void runFlywayMigrations(Configuration configuration) {
        String url = configuration.getProperty("hibernate.connection.url");
        String user = configuration.getProperty("hibernate.connection.username");
        String password = configuration.getProperty("hibernate.connection.password");

        // -Dproject.root is set by the Tomcat launcher to the api-java root
        // (the folder that contains both backend/ and db_migrations/).
        String projectRoot = System.getProperty("project.root", ".");

        Flyway flyway = Flyway.configure()
                .dataSource(url, user, password)
                .locations("filesystem:" + projectRoot + "/db_migrations/MIGRATIONS")
                .outOfOrder(true)
                .validateOnMigrate(false)
                .load();

        flyway.migrate();
        log.info("Flyway migrations completed.");
    }

    public static Session getSession() {
        Session session = threadLocal.get();
        if (session == null || !session.isOpen()) {
            if (sessionFactory == null) {
                initialize();
            }
            session = sessionFactory.openSession();
            threadLocal.set(session);
        }
        return session;
    }

    public static Transaction beginHibernateTransaction() {
        Session session = getSession();
        return session.beginTransaction();
    }

    public static void closeSession() {
        Session session = threadLocal.get();
        if (session != null && session.isOpen()) {
            session.close();
        }
        threadLocal.remove();
    }
}
