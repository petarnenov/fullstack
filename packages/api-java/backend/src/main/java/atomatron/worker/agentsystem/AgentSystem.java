package atomatron.worker.agentsystem;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.amp.agent.accounts.AccountsTrait;
import com.amp.agent.auth.AuthTrait;
import com.amp.agent.billing.BillingTrait;
import com.amp.agent.trading.TradingTrait;

import akka.actor.ActorRef;
import atomatron.worker.agent.Agent;
import atomatron.worker.agent.Trait;
import booter.amp.messaging.AkkaBooter;

public class AgentSystem {
    private static final Logger log = LoggerFactory.getLogger(AgentSystem.class);

    private static AgentSystem sole;

    private AgentSystem() {
        createAgents();
    }

    public static synchronized AgentSystem getSole() {
        if (sole == null) {
            sole = new AgentSystem();
        }
        return sole;
    }

    private void createAgents() {
        log.info("Creating agents...");

        AuthTrait authTrait = new AuthTrait();
        createAgent("AuthManager", List.of(authTrait));

        BillingTrait billingTrait = new BillingTrait();
        createAgent("BillingManager", List.of(billingTrait));

        AccountsTrait accountsTrait = new AccountsTrait();
        createAgent("AccountsManager", List.of(accountsTrait));

        TradingTrait tradingTrait = new TradingTrait();
        createAgent("TradingManager", List.of(tradingTrait));

        log.info("All agents created successfully.");
    }

    private void createAgent(String name, List<Trait> traits) {
        AkkaBooter booter = AkkaBooter.getSole();
        ActorRef agentRef = booter.getActorSystem().actorOf(Agent.props(name, traits), name);
        booter.registerAgent(name, agentRef, traits);
        log.info("Agent [{}] created and registered.", name);
    }
}
