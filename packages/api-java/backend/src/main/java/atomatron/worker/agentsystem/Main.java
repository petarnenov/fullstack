package atomatron.worker.agentsystem;

import booter.amp.messaging.AkkaBooter;
import com.amp.util.hibernate.HibernateSessionFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main {
    private static final Logger log = LoggerFactory.getLogger(Main.class);

    public static void boot() {
        log.info("=== Starting AMP Boot Sequence ===");

        log.info("Step 1: Initializing Hibernate...");
        HibernateSessionFactory.initialize();

        log.info("Step 2: Starting Akka ActorSystem...");
        AkkaBooter.getSole();

        log.info("Step 3: Creating Agent System...");
        AgentSystem.getSole();

        log.info("=== AMP Boot Sequence Complete ===");
    }

    public static void shutdown() {
        log.info("=== Shutting down AMP ===");
        try {
            AkkaBooter.shutdown();
        } catch (Exception e) {
            log.error("Error during shutdown", e);
        }
        log.info("=== AMP Shutdown Complete ===");
    }
}
