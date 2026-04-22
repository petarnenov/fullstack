package atomatron.worker.agent.message;

import akka.actor.ActorRef;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

@Getter
@Setter
public class Message implements Serializable {
    private static final long serialVersionUID = 1L;

    private String uuid;
    private transient ActorRef sender;
    private Problem problem;
    private boolean oneWay;

    public Message() {
        this.uuid = UUID.randomUUID().toString();
    }

    public int numbOfRetries() {
        return 3;
    }
}
