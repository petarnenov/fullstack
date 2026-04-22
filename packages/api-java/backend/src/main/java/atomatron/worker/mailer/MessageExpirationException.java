package atomatron.worker.mailer;

import atomatron.worker.agent.message.Message;

public class MessageExpirationException extends RuntimeException {
    private final Message message;

    public MessageExpirationException(Message message) {
        super("Message expired: " + message.getClass().getSimpleName());
        this.message = message;
    }

    public Message getExpiredMessage() {
        return message;
    }
}
