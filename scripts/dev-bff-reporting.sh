#!/usr/bin/env bash
# Launch the Spring Boot BFF (packages/bff-reporting) as part of `npm run dev`.
#
# Graceful skip rules (same philosophy as dev-api-java.sh):
#   - :8090 already bound by something else → skip, keep sibling processes alive
#   - ./gradlew bootJar fails → skip, so concurrently -k doesn't tear down the
#     whole dev stack. The reporting MFE will show its own "unreachable" state
#     in that case, which is the intended visible failure mode.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BFF_DIR="$REPO_ROOT/packages/bff-reporting"
BFF_JAR="$BFF_DIR/build/libs/amp-bff-reporting.jar"

skip() {
    echo "[bff-reporting] $1"
    echo "[bff-reporting] idle — /api/reporting/* will be unreachable until this is fixed"
    exec tail -f /dev/null
}

if command -v lsof >/dev/null 2>&1 && lsof -i :8090 >/dev/null 2>&1; then
    skip "skipping: port 8090 already in use"
fi

cd "$BFF_DIR"

echo "[bff-reporting] building fat jar…"
if ! ./gradlew bootJar --quiet; then
    skip "skipping: ./gradlew bootJar failed"
fi

if [ ! -f "$BFF_JAR" ]; then
    skip "skipping: expected jar not found at $BFF_JAR"
fi

echo "[bff-reporting] starting on :8090"
exec java -jar "$BFF_JAR"
