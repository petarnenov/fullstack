package com.amp.web.listeners;

import atomatron.worker.agentsystem.Main;
import com.amp.agent.auth.AuthProcess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

public class AgentSystemStarterListener implements ServletContextListener {
    private static final Logger log = LoggerFactory.getLogger(AgentSystemStarterListener.class);

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        log.info("Starting Agent System (synchronous boot — Tomcat will wait)...");
        try {
            Main.boot();
            // V20260422_00001_03 seeds plaintext demo passwords so the migration
            // stays human-readable; rehash to argon2id once the SessionFactory
            // is up so the DB never serves a real request holding plaintext.
            // Idempotent — rows already prefixed with $argon2 are skipped.
            AuthProcess.ensureArgon2Hashes();
            log.info("Agent System started successfully. Tomcat ready to serve.");
        } catch (Exception e) {
            log.error("Failed to boot Agent System", e);
        }
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        log.info("Shutting down Agent System...");
        Main.shutdown();
        log.info("Agent System shut down.");
    }
}
