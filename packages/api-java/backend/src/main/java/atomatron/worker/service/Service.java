package atomatron.worker.service;

import atomatron.worker.agent.message.Message;
import atomatron.worker.mailer.Mailer;
import atomatron.worker.mailer.MessageExpirationException;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;

public abstract class Service {
    private static final Logger log = LoggerFactory.getLogger(Service.class);

    @Getter
    protected String providerName;
    public static long MAX_TIMEOUT = Duration.ofMinutes(30).toMillis();

    public Service(String aString) {
        providerName = aString;
    }

    public Message providerSendAndWait(Message message) {
        return providerSendAndWait(message, defaultWaitTime());
    }

    public Message providerSendAndWait(Message message, long timeout) {
        Message result = null;
        int numberOfRetries = 0;
        do {
            try {
                result = Mailer.sendAndWait(getProviderName(), message, Math.min(timeout, MAX_TIMEOUT));
                break;
            } catch (MessageExpirationException pe) {
                numberOfRetries++;
                log.warn("Message expired, retry {}/{}", numberOfRetries, message.numbOfRetries());
            }
        } while (numberOfRetries < message.numbOfRetries());

        if (result == null) throw new ServiceTimeoutException(providerName);
        if (result.getProblem() != null) throw new ServiceException(providerName, result.getProblem());
        return result;
    }

    public void providerSend(String providerName, Message aMessage) {
        Mailer.send(providerName, aMessage);
    }

    public long defaultWaitTime() {
        return 500_000L;
    }
}
