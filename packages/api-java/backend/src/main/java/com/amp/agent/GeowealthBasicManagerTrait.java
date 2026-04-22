package com.amp.agent;

import atomatron.worker.agent.Trait;
import atomatron.worker.agent.message.Message;
import atomatron.worker.agent.message.Problem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public abstract class GeowealthBasicManagerTrait extends Trait {
    private static final long serialVersionUID = 1L;
    protected final Logger log = LoggerFactory.getLogger(getClass());

    protected void logAndThrow(Throwable ex, Message msg) throws Throwable {
        log.error("Error processing message: {}", msg.getClass().getSimpleName(), ex);
        msg.setProblem(new Problem(ex.getMessage(), ex));
        throw ex;
    }
}
