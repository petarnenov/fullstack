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
exec java -jar "$SVC_JAR"
