# Mirrors the ~/geo-mini Makefile: external Tomcat, catalina.sh, WAR deployed
# to $(TOMCAT_HOME)/webapps/ROOT.war, CATALINA_OPTS carries -Dproject.root so
# HibernateSessionFactory can find db_migrations/MIGRATIONS at runtime.
#
# Override TOMCAT_HOME if your Tomcat lives elsewhere:
#     make start TOMCAT_HOME=/home/petar/AppServer/apache-tomcat-9.0.38
#
# Port: whatever <TOMCAT_HOME>/conf/server.xml is configured for (8080 by
# default). Make sure that port is free before `make start`.

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
TOMCAT_HOME = /opt/homebrew/opt/tomcat@9/libexec
else
TOMCAT_HOME = /opt/tomcat
endif
PROJECT_DIR = $(shell pwd)
WAR_FILE    = $(PROJECT_DIR)/backend/build/libs/amp-api-java.war

export CATALINA_OPTS = -Dproject.root=$(PROJECT_DIR)

.PHONY: build
build:
	cd backend && ./gradlew war

.PHONY: deploy
deploy: build
	rm -rf $(TOMCAT_HOME)/webapps/ROOT $(TOMCAT_HOME)/webapps/ROOT.war
	cp $(WAR_FILE) $(TOMCAT_HOME)/webapps/ROOT.war

.PHONY: redeploy
redeploy: deploy
	@echo "Redeployed. Tomcat will auto-reload."

.PHONY: start
start: deploy
	@echo "Starting Tomcat from $(TOMCAT_HOME) (Ctrl+C to stop)..."
	@trap 'kill 0' EXIT; \
		$(TOMCAT_HOME)/bin/catalina.sh run & \
		wait

.PHONY: stop
stop:
	$(TOMCAT_HOME)/bin/catalina.sh stop 2>/dev/null || true

.PHONY: restart
restart: stop
	@echo "Waiting for Tomcat to stop..."
	@while $(TOMCAT_HOME)/bin/catalina.sh status 2>/dev/null; do sleep 1; done 2>/dev/null || true
	@sleep 2
	@$(MAKE) start

# Watch mode: rebuild + redeploy on any change under backend/src or
# db_migrations/. Requires `fswatch` on your PATH.
.PHONY: dev
dev: deploy
	@echo "Dev mode: Tomcat + fswatch rebuild loop (Ctrl+C to stop)..."
	@trap 'kill 0' EXIT; \
	$(TOMCAT_HOME)/bin/catalina.sh run & \
	TOMCAT_PID=$$!; \
	fswatch -o -l 5 $(PROJECT_DIR)/backend/src/main/java $(PROJECT_DIR)/backend/src/main/resources $(PROJECT_DIR)/db_migrations | while read; do \
		echo "[watch] Change detected, rebuilding..."; \
		kill $$TOMCAT_PID 2>/dev/null; wait $$TOMCAT_PID 2>/dev/null; \
		sleep 2; \
		(cd $(PROJECT_DIR)/backend && ./gradlew war -q) && \
		rm -rf $(TOMCAT_HOME)/webapps/ROOT $(TOMCAT_HOME)/webapps/ROOT.war && \
		cp $(WAR_FILE) $(TOMCAT_HOME)/webapps/ROOT.war && \
		$(TOMCAT_HOME)/bin/catalina.sh run & \
		TOMCAT_PID=$$!; \
		echo "[watch] Tomcat restarted (PID $$TOMCAT_PID)."; \
	done & \
	wait

# Debug mode: Tomcat in JPDA mode on port 5005 (attach from IDE).
.PHONY: debug
debug: deploy
	@echo "Debug mode: Tomcat with JDWP on port 5005..."
	JPDA_ADDRESS=5005 JPDA_TRANSPORT=dt_socket $(TOMCAT_HOME)/bin/catalina.sh jpda run

.PHONY: help
help:
	@echo "Targets:"
	@echo "  build      — build backend WAR"
	@echo "  deploy     — build + copy WAR to \$$TOMCAT_HOME/webapps/ROOT.war"
	@echo "  redeploy   — deploy (for a running Tomcat to auto-reload)"
	@echo "  start      — deploy + catalina.sh run (foreground)"
	@echo "  stop       — catalina.sh stop"
	@echo "  restart    — stop + start"
	@echo "  dev        — deploy + fswatch auto-rebuild loop"
	@echo "  debug      — deploy + catalina.sh jpda run (debug port 5005)"
	@echo ""
	@echo "Env:"
	@echo "  TOMCAT_HOME     = $(TOMCAT_HOME)"
	@echo "  PROJECT_DIR     = $(PROJECT_DIR)"
	@echo "  WAR_FILE        = $(WAR_FILE)"
	@echo "  CATALINA_OPTS   = $(CATALINA_OPTS)"
