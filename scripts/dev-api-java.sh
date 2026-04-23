#!/usr/bin/env bash
# Launch the Java WAR (packages/api-java) as part of `npm run dev`.
#
# Graceful skip rules:
#   - no TOMCAT_HOME set / path missing → skip, keep sibling processes alive
#   - :8088 already bound by something else → skip, keep sibling processes alive
# Skipping is done by tail -f /dev/null so `concurrently -k --kill-others-on-fail`
# doesn't tear down the whole dev stack when Tomcat isn't configured yet.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
    set -a; . "$REPO_ROOT/.env"; set +a
fi

skip() {
    echo "[api-java] $1"
    echo "[api-java] idle — the Node API on :3000 will keep serving /api/* in the meantime"
    exec tail -f /dev/null
}

if [ -z "${TOMCAT_HOME:-}" ]; then
    skip "skipping: TOMCAT_HOME not set in .env (see .env.example for instructions)"
fi

if [ ! -d "$TOMCAT_HOME" ]; then
    skip "skipping: TOMCAT_HOME=$TOMCAT_HOME doesn't exist"
fi

if command -v lsof >/dev/null 2>&1 && lsof -i :8088 >/dev/null 2>&1; then
    skip "skipping: port 8088 already in use"
fi

# Pin a known-good JDK when .env sets JAVA_HOME_DEMO — the system default
# may be a Corretto build that crashes on this stack (see .env for context).
if [ -n "${JAVA_HOME_DEMO:-}" ] && [ -x "$JAVA_HOME_DEMO/bin/java" ]; then
    export JAVA_HOME="$JAVA_HOME_DEMO"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

cd "$REPO_ROOT/packages/api-java"
exec make start
