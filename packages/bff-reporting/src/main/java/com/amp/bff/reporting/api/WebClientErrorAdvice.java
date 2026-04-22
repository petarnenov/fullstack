package com.amp.bff.reporting.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * Preserve upstream HTTP status codes. When the monolith rejects a forwarded
 * token with 401, the BFF must reply 401 too — otherwise the MFE axios
 * interceptor can't tell it's an auth failure and won't dispatch the
 * amp:auth-expired event the shell listens for (see constraint #6).
 */
@RestControllerAdvice
public class WebClientErrorAdvice {

    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<String> passThroughUpstreamStatus(WebClientResponseException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(ex.getResponseBodyAsString());
    }
}
