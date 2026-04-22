package atomatron.worker.agent;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

public class AgentStats {
    private static final int MAX_LOG_ENTRIES = 100;

    private final AtomicLong messageCount = new AtomicLong(0);
    private final AtomicLong errorCount = new AtomicLong(0);
    private final AtomicLong totalMemoryAllocated = new AtomicLong(0);
    private final AtomicLong netRetainedMemory = new AtomicLong(0);
    private volatile long lastMemoryAllocated;
    private volatile long peakMemoryAllocated;
    private volatile String lastMessageType;
    private volatile LocalDateTime lastMessageTime;
    private volatile LocalDateTime startedAt;
    private final LinkedList<LogEntry> logs = new LinkedList<>();

    public AgentStats() {
        this.startedAt = LocalDateTime.now();
    }

    public long snapshotMemoryBefore() {
        Runtime rt = Runtime.getRuntime();
        return rt.totalMemory() - rt.freeMemory();
    }

    public void recordMessage(String messageType, long memBefore) {
        messageCount.incrementAndGet();
        lastMessageType = messageType;
        lastMessageTime = LocalDateTime.now();

        Runtime rt = Runtime.getRuntime();
        long memAfter = rt.totalMemory() - rt.freeMemory();
        long delta = Math.max(0, memAfter - memBefore);
        lastMemoryAllocated = delta;
        totalMemoryAllocated.addAndGet(delta);
        if (delta > peakMemoryAllocated) {
            peakMemoryAllocated = delta;
        }

        Runtime.getRuntime().gc();
        long afterGc = rt.totalMemory() - rt.freeMemory();
        long retained = Math.max(0, afterGc - memBefore);
        netRetainedMemory.addAndGet(retained);

        addLog("INFO", "Processed: " + messageType
                + " (alloc: " + formatBytes(delta)
                + ", retained: " + formatBytes(retained) + ")");
    }

    public void recordError(String messageType, String error) {
        errorCount.incrementAndGet();
        addLog("ERROR", messageType + " — " + error);
    }

    public void addLog(String level, String message) {
        synchronized (logs) {
            logs.addFirst(new LogEntry(LocalDateTime.now(), level, message));
            if (logs.size() > MAX_LOG_ENTRIES) {
                logs.removeLast();
            }
        }
    }

    public long getMessageCount() { return messageCount.get(); }
    public long getErrorCount() { return errorCount.get(); }
    public long getTotalMemoryAllocated() { return totalMemoryAllocated.get(); }
    public long getNetRetainedMemory() { return netRetainedMemory.get(); }
    public long getLastMemoryAllocated() { return lastMemoryAllocated; }
    public long getPeakMemoryAllocated() { return peakMemoryAllocated; }
    public String getLastMessageType() { return lastMessageType; }
    public LocalDateTime getLastMessageTime() { return lastMessageTime; }
    public LocalDateTime getStartedAt() { return startedAt; }

    public List<LogEntry> getLogs() {
        synchronized (logs) {
            return new ArrayList<>(logs);
        }
    }

    private static String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        return String.format("%.1f MB", bytes / (1024.0 * 1024));
    }

    public void reset() {
        messageCount.set(0);
        errorCount.set(0);
        totalMemoryAllocated.set(0);
        netRetainedMemory.set(0);
        lastMemoryAllocated = 0;
        peakMemoryAllocated = 0;
        lastMessageType = null;
        lastMessageTime = null;
        startedAt = LocalDateTime.now();
        synchronized (logs) {
            logs.clear();
        }
        addLog("INFO", "Agent started");
    }

    public static class LogEntry {
        private final LocalDateTime timestamp;
        private final String level;
        private final String message;

        public LogEntry(LocalDateTime timestamp, String level, String message) {
            this.timestamp = timestamp;
            this.level = level;
            this.message = message;
        }

        public LocalDateTime getTimestamp() { return timestamp; }
        public String getLevel() { return level; }
        public String getMessage() { return message; }
    }
}
