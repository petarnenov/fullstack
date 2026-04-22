package atomatron.worker.agent;

import atomatron.worker.agent.message.Message;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

public class Trait implements Serializable {
    private static final long serialVersionUID = 1L;

    protected ReactionMap whenReactionMap;
    protected ReactionMap afterReactionMap;

    @Getter
    @Setter
    protected Agent agent;

    public Trait() {
        whenReactionMap = new ReactionMap(ReactionMap.WHEN_MAP);
        afterReactionMap = new ReactionMap(ReactionMap.AFTER_MAP);
    }

    public void when(Class<? extends Message> aMessageClass, Reaction aReaction) {
        whenReactionMap.add(aMessageClass, aReaction);
    }

    protected void handleWhen(Agent anAgent, Message aMessage) {
        whenReactionMap.fireReactions(anAgent, aMessage);
    }

    public void prepareReactions() {
        // Override in subclasses
    }

    public boolean canHandle(Class<? extends Message> messageClass) {
        return whenReactionMap.hasReactionFor(messageClass);
    }
}
