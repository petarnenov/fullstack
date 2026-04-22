package com.amp.arch.telemetry;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * In-memory ring buffer of recent telemetry events + fan-out to live SSE
 * subscribers (the visualiser).
 *
 * The buffer lets a late-joining visualiser catch up on the last N events,
 * which matters during a live demo if you open the dashboard after the backend
 * has already been running.
 */
@Component
public class EventStore {

    private static final Logger log = LoggerFactory.getLogger(EventStore.class);

    private final int bufferSize;
    private final Deque<TelemetryEvent> buffer = new ConcurrentLinkedDeque<>();
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public EventStore(@Value("${amp.telemetry.ring-buffer-size:1000}") int bufferSize) {
        this.bufferSize = bufferSize;
    }

    public void record(TelemetryEvent event) {
        buffer.addLast(event);
        while (buffer.size() > bufferSize) {
            buffer.pollFirst();
        }
        broadcast(event);
    }

    public List<TelemetryEvent> recent(int limit) {
        List<TelemetryEvent> snapshot = new ArrayList<>(buffer);
        int from = Math.max(0, snapshot.size() - limit);
        return snapshot.subList(from, snapshot.size());
    }

    public SseEmitter subscribe() {
        // 0 = no timeout; application.yml request-timeout keeps the async
        // dispatcher alive for up to an hour.
        SseEmitter emitter = new SseEmitter(0L);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        emitters.add(emitter);
        try {
            emitter.send(SseEmitter.event().name("hello").data("connected"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    private void broadcast(TelemetryEvent event) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("event").data(event));
            } catch (IOException | IllegalStateException e) {
                log.debug("dropping dead emitter: {}", e.getMessage());
                emitters.remove(emitter);
            }
        }
    }
}
