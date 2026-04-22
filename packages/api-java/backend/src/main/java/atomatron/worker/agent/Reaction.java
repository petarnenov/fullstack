package atomatron.worker.agent;

import atomatron.worker.agent.message.Message;
import lombok.Setter;

import java.io.Serializable;

public abstract class Reaction implements Serializable {
    private static final long serialVersionUID = 1L;

    @Setter
    protected Agent agent;

    public void fire(Message aMessage) {
        try {
            react(aMessage);
        } catch (Throwable e) {
            e.printStackTrace();
        }
    }

    public abstract void react(Message aMessage) throws Throwable;
}
