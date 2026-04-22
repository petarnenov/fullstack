package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class ResponseJTO extends AbstractJTO {
    protected boolean success;
    protected List<String> errors;
    protected List<String> messages;
    protected List<String> warnings;
    protected Object data;

    public ResponseJTO() {
        this.success = true;
        this.errors = new ArrayList<>();
        this.messages = new ArrayList<>();
        this.warnings = new ArrayList<>();
    }

    public void addError(String error) {
        this.errors.add(error);
        this.success = false;
        this.objectType = "error";
    }

    public void addMessage(String msg) {
        this.messages.add(msg);
    }

    public void addWarning(String warning) {
        this.warnings.add(warning);
    }
}
