package atomatron.worker.service;

public class ServiceTimeoutException extends RuntimeException {
    public ServiceTimeoutException(String providerName) {
        super("Service timeout for provider: " + providerName);
    }
}
