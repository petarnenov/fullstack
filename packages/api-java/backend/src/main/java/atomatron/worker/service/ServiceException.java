package atomatron.worker.service;

import atomatron.worker.agent.message.Problem;

public class ServiceException extends RuntimeException {
    public ServiceException(String providerName, Problem problem) {
        super("Service error in " + providerName + ": " + problem.getDescription());
    }
}
