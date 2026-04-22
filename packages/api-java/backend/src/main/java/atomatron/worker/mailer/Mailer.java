package atomatron.worker.mailer;

import akka.actor.ActorRef;
import akka.pattern.Patterns;
import atomatron.worker.agent.message.Message;
import booter.amp.messaging.AkkaBooter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import scala.concurrent.Await;
import scala.concurrent.Future;
import scala.concurrent.duration.Duration;

import java.util.concurrent.TimeoutException;

public class Mailer {
    private static final Logger log = LoggerFactory.getLogger(Mailer.class);

    public static Message sendAndWait(String providerName, Message aMessage, long waitPeriod) {
        ActorRef agent = AkkaBooter.getSole().getAgentRef(providerName);
        if (agent == null) {
            throw new RuntimeException("No agent found for provider: " + providerName);
        }

        Duration timeout = Duration.create(waitPeriod, "milliseconds");
        Future<Object> future = Patterns.ask(agent, aMessage, waitPeriod);

        return waitAndTakeResult(future, timeout, aMessage);
    }

    public static void send(String providerName, Message aMessage) {
        ActorRef agent = AkkaBooter.getSole().getAgentRef(providerName);
        if (agent != null) {
            agent.tell(aMessage, ActorRef.noSender());
        }
    }

    private static Message waitAndTakeResult(Future<Object> future, Duration timeout, Message aMessage) {
        try {
            return (Message) Await.result(future, timeout);
        } catch (TimeoutException pe) {
            log.error("Message timeout: {}", aMessage.getClass().getSimpleName());
            throw new MessageExpirationException(aMessage);
        } catch (Exception e) {
            log.error("Error waiting for message result", e);
            return null;
        }
    }
}
