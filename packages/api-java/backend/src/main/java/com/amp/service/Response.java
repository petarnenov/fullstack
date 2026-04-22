package com.amp.service;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class Response implements Serializable {

    private List<String> errors = new ArrayList<>();
    private List<String> logMessages = new ArrayList<>();

    public Response() {
    }

    public Response(List<String> errors, List<String> logMessages) {
        this.errors = errors;
        this.logMessages = logMessages;
    }

    public void addError(String error) {
        errors.add(error);
    }

    public void addMessage(String msg) {
        logMessages.add(msg);
    }

    public List<String> getErrors() {
        return errors;
    }

    public List<String> getLogMessages() {
        return logMessages;
    }

    public boolean isSuccess() {
        return ((errors == null) || (errors.isEmpty()));
    }

    public boolean hasMessages() {
        return ((logMessages != null) && (logMessages.isEmpty()));
    }
}
