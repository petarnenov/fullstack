package atomatron.worker.agent;

import atomatron.worker.agent.message.Message;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

public class ReactionMap implements Serializable {
    private static final long serialVersionUID = 1L;

    public static final String WHEN_MAP = "when";
    public static final String AFTER_MAP = "after";

    private final String type;
    private final Map<Class<? extends Message>, Reaction> reactions = new HashMap<>();

    public ReactionMap(String type) {
        this.type = type;
    }

    public void add(Class<? extends Message> messageClass, Reaction reaction) {
        reactions.put(messageClass, reaction);
    }

    public void fireReactions(Agent agent, Message message) {
        Reaction reaction = reactions.get(message.getClass());
        if (reaction != null) {
            reaction.setAgent(agent);
            reaction.fire(message);
        }
    }

    public boolean hasReactionFor(Class<? extends Message> messageClass) {
        return reactions.containsKey(messageClass);
    }
}
