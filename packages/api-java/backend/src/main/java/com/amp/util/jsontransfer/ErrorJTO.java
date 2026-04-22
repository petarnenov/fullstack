package com.amp.util.jsontransfer;

import lombok.Getter;

@Getter
public class ErrorJTO {
    private final String error;

    public ErrorJTO(String error) {
        this.error = error;
    }
}
