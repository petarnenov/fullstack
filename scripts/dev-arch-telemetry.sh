#!/usr/bin/env bash
# Launch the arch-telemetry Spring Boot service (packages/arch-telemetry) as
# part of `npm run dev`. Pattern mirrors dev-bff-reporting.sh.
#
# Graceful skip rules:
#   - :8091 already bound → skip, keep siblings alive
#   - ./gradlew bootJar fails → skip. Telemetry is demo-only observability; if
#     it's down the real demo still works, the visualiser just shows no events.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVC_DIR="$REPO_ROOT/packages/arch-telemetry"
SVC_JAR="$SVC_DIR/build/libs/amp-arch-telemetry.jar"

if [ -f "$REPO_ROOT/.env" ]; then
    set -a; . "$REPO_ROOT/.env"; set +a
fi

if [ -n "${JAVA_HOME_DEMO:-}" ] && [ -x "$JAVA_HOME_DEMO/bin/java" ]; then
    export JAVA_HOME="$JAVA_HOME_DEMO"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

# TieredStopAtLevel=1 keeps the C1 JIT but disables C2. C2 has been crashing
# on this host across multiple JDKs, which points at RAM/kernel rather than
# a JVM bug — until that's fixed offline, C1-only is the safe default for
# the demo. Small perf hit, no functional change.
JAVA_SAFE_OPTS="-XX:TieredStopAtLevel=1"

skip() {
    echo "[arch-telemetry] $1"
    echo "[arch-telemetry] idle — visualiser at :5199 will be empty until this is fixed"
    exec tail -f /dev/null
}

if command -v lsof >/dev/null 2>&1 && lsof -i :8091 >/dev/null 2>&1; then
    skip "skipping: port 8091 already in use"
fi

cd "$SVC_DIR"

echo "[arch-telemetry] building fat jar…"
if ! ./gradlew bootJar --quiet; then
    skip "skipping: ./gradlew bootJar failed"
fi

if [ ! -f "$SVC_JAR" ]; then
    skip "skipping: expected jar not found at $SVC_JAR"
fi

echo "[arch-telemetry] starting on :8091"
exec java $JAVA_SAFE_OPTS -jar "$SVC_JAR"
