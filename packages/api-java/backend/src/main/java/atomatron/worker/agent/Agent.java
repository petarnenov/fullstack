package atomatron.worker.agent;

import akka.actor.AbstractActor;
import akka.actor.Props;
import atomatron.worker.agent.message.Message;
import booter.amp.messaging.AkkaBooter;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

public class Agent extends AbstractActor {
    private static final Logger log = LoggerFactory.getLogger(Agent.class);

    @Getter
    private final String name;
    private final List<Trait> traits;

    public Agent(String name, List<Trait> traits) {
        this.name = name;
        this.traits = traits;
        for (Trait trait : traits) {
            trait.setAgent(this);
            trait.prepareReactions();
        }
    }

    public static Props props(String name, List<Trait> traits) {
        return Props.create(Agent.class, () -> new Agent(name, new ArrayList<>(traits)));
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
                .match(Message.class, this::onMessage)
                .build();
    }

    private void onMessage(Message message) {
        String msgType = message.getClass().getSimpleName();
        log.debug("Agent [{}] received message: {}", name, msgType);
        AgentStats stats = AkkaBooter.getSole().getAgentStats(name);
        long memBefore = stats != null ? stats.snapshotMemoryBefore() : 0;
        for (Trait trait : traits) {
            if (trait.canHandle(message.getClass())) {
                try {
                    trait.handleWhen(this, message);
                    if (stats != null) stats.recordMessage(msgType, memBefore);
                } catch (Exception e) {
                    if (stats != null) stats.recordError(msgType, e.getMessage());
                }
                break;
            }
        }
        if (!message.isOneWay()) {
            getSender().tell(message, getSelf());
        }
    }
}
