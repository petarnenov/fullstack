package com.amp.bff.reporting.telemetry;

import org.springframework.boot.web.reactive.function.client.WebClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the telemetry filter into every WebClient built from the auto-wired
 * WebClient.Builder (see MonolithClient). A single bean covers the entire
 * outbound fan-out — no per-call boilerplate.
 */
@Configuration
public class TelemetryConfig {

    @Bean
    public WebClientCustomizer telemetryWebClientCustomizer(TelemetryWebClientFilter filter) {
        return builder -> builder.filter(filter);
    }
}
