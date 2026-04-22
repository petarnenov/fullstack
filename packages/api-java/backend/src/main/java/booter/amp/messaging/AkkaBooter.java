package booter.amp.messaging;

import akka.actor.ActorRef;
import akka.actor.ActorSystem;
import akka.actor.PoisonPill;
import atomatron.worker.agent.Agent;
import atomatron.worker.agent.AgentStats;
import atomatron.worker.agent.Trait;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import scala.concurrent.Await;
import scala.concurrent.duration.Duration;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

public class AkkaBooter {
    private static final Logger log = LoggerFactory.getLogger(AkkaBooter.class);

    private static AkkaBooter sole;

    @Getter
    private ActorSystem actorSystem;

    private final Map<String, ActorRef> agents = new ConcurrentHashMap<>();
    private final Map<String, AgentStats> agentStats = new ConcurrentHashMap<>();
    private final Map<String, List<Trait>> agentTraits = new ConcurrentHashMap<>();
    private final Set<String> autoStartDisabled = ConcurrentHashMap.newKeySet();

    private AkkaBooter() {
        Config config = ConfigFactory.load();
        String clusterName = BooterConstants.SYSTEM_NAME;
        log.info("Creating ActorSystem: {}", clusterName);
        actorSystem = ActorSystem.create(clusterName, config);
        log.info("ActorSystem [{}] created successfully.", clusterName);
    }

    public static synchronized AkkaBooter getSole() {
        if (sole == null) {
            sole = new AkkaBooter();
        }
        return sole;
    }

    public void registerAgent(String name, ActorRef ref, List<Trait> traits) {
        agents.put(name, ref);
        agentTraits.put(name, traits);
        agentStats.put(name, new AgentStats());
        log.info("Registered agent: {}", name);
    }

    public void registerAgent(String name, ActorRef ref) {
        registerAgent(name, ref, List.of());
    }

    public ActorRef getAgentRef(String name) {
        return agents.get(name);
    }

    public Set<String> getAgentNames() {
        return agents.keySet();
    }

    public Set<String> getAllAgentNames() {
        return agentTraits.keySet();
    }

    public AgentStats getAgentStats(String name) {
        return agentStats.get(name);
    }

    public boolean isAgentRunning(String name) {
        return agents.containsKey(name);
    }

    public boolean isAutoStartEnabled(String name) {
        return !autoStartDisabled.contains(name);
    }

    public void setAutoStart(String name, boolean enabled) {
        if (enabled) {
            autoStartDisabled.remove(name);
            log.info("Auto-start enabled for agent: {}", name);
        } else {
            autoStartDisabled.add(name);
            log.info("Auto-start disabled for agent: {}", name);
        }
    }

    public void stopAgent(String name) {
        ActorRef ref = agents.remove(name);
        if (ref != null) {
            ref.tell(PoisonPill.getInstance(), ActorRef.noSender());
            AgentStats stats = agentStats.get(name);
            if (stats != null) {
                stats.addLog("WARN", "Agent stopped");
            }
            log.info("Stopped agent: {}", name);
        }
    }

    public void startAgent(String name) {
        if (agents.containsKey(name)) {
            log.warn("Agent {} is already running", name);
            return;
        }
        List<Trait> traits = agentTraits.get(name);
        if (traits == null || traits.isEmpty()) {
            log.error("No traits found for agent: {}", name);
            return;
        }
        ActorRef ref = actorSystem.actorOf(Agent.props(name, traits), name);
        agents.put(name, ref);
        AgentStats stats = agentStats.get(name);
        if (stats != null) {
            stats.reset();
        }
        log.info("Started agent: {}", name);
    }

    public static synchronized void shutdown() {
        if (sole != null && sole.actorSystem != null) {
            log.info("Terminating ActorSystem...");
            try {
                sole.actorSystem.terminate();
                Await.result(sole.actorSystem.whenTerminated(), Duration.create(10, TimeUnit.SECONDS));
            } catch (Exception e) {
                log.error("Error waiting for ActorSystem termination", e);
            }
            sole = null;
            log.info("ActorSystem terminated.");
        }
    }
}
