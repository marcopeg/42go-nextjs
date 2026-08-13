###
### Development Utilities
###

# Dynamic version from package.json
VERSION := $(shell node -p "require('./package.json').version")
-include .env
IMAGE ?= marcopeg/42go-next
UNIVERSAL_PLATFORMS ?= linux/amd64,linux/arm64
CAPROVER ?= npx --yes caprover
CAPROVER_URL := $(subst ",,$(CAPROVER_URL))
CAPROVER_APP ?= a42go-multi
CAPROVER_APP := $(subst ",,$(CAPROVER_APP))
CAPROVER_APP_TOKEN := $(subst ",,$(CAPROVER_APP_TOKEN))
CAPROVER_IMAGE ?= $(IMAGE):$(VERSION)
CAPROVER_IMAGE := $(subst ",,$(CAPROVER_IMAGE))
DEPLOYMENT_URL ?= https://read.lingocafe.app/api/version
DEPLOYMENT_VERIFY_INITIAL_WAIT ?= 30
DEPLOYMENT_VERIFY_INTERVAL ?= 10
DEPLOYMENT_VERIFY_ATTEMPTS ?= 30
SKIP_DEPLOYMENT_VERIFY ?= 0
BACKLOG_DOCTOR_LOCAL := .agents/skills/backlog-doctor/scripts/doctor_backlog.py
BACKLOG_DOCTOR_HOME := $(HOME)/.agents/skills/backlog-doctor/scripts/doctor_backlog.py
BACKLOG_ROOT := $(CURDIR)/docs/backlog
SECURITY_CHECK := .agents/skills/42go-security-check/scripts/run_security_check.py
SECURITY_IMAGE ?= 42go-next:latest
DEV_LAUNCH_LABEL ?= 42go-nextjs.dev
DEV_NODE_BIN := $(dir $(shell command -v node))

export CAPROVER_URL
export CAPROVER_APP_TOKEN

boot:
	$(MAKE) start
	$(MAKE) app.install
	$(MAKE) migrate
	$(MAKE) seed
	$(MAKE) app.start

boot.detached:
	$(MAKE) start
	$(MAKE) app.install
	$(MAKE) migrate
	$(MAKE) seed
	$(MAKE) app.start.detached

reboot:
	$(MAKE) clear
	$(MAKE) boot

reboot.detached:
	$(MAKE) clear
	$(MAKE) boot.detached

start:
	docker-compose up -d
	@echo "Waiting for PostgreSQL to be ready..."
	@until nc -z localhost 5432; do \
		echo "PostgreSQL is unavailable - sleeping"; \
		sleep 1; \
	done
	@echo "PostgreSQL is up and running!"

start.api:
	npm install --prefix api
	npm run start:dev --prefix api

stop:
	docker-compose stop

down:
	docker-compose down -v 

# New commands
app.stop:
	@launchctl remove "$(DEV_LAUNCH_LABEL)" 2>/dev/null || true
	@pids="$$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)"; \
	if [ -z "$$pids" ]; then \
		echo "No process is listening on port 3000."; \
	else \
		echo "Stopping port 3000 listener(s): $$pids"; \
		kill $$pids; \
		for attempt in 1 2 3 4 5; do \
			remaining="$$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)"; \
			[ -z "$$remaining" ] && break; \
			sleep 1; \
		done; \
		remaining="$$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)"; \
		if [ -n "$$remaining" ]; then \
			echo "Force-stopping port 3000 listener(s): $$remaining"; \
			kill -9 $$remaining; \
		fi; \
	fi
	@rm -f .cache/42go-dev.pid

clear:
	$(MAKE) app.stop
	$(MAKE) down
	$(MAKE) app.clear

app.clear:
	rm -rf node_modules
	rm -rf .next
	rm -rf .cache

app.install:
	npm install --legacy-peer-deps

app.start:
	npm run dev

app.start.detached:
	@if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then \
		echo "Development server is already listening on port 3000."; \
	else \
		mkdir -p .cache; \
		launchctl remove "$(DEV_LAUNCH_LABEL)" 2>/dev/null || true; \
		launchctl submit -l "$(DEV_LAUNCH_LABEL)" \
			-o "$(CURDIR)/.cache/42go-dev.log" \
			-e "$(CURDIR)/.cache/42go-dev.log" \
			-- /bin/zsh -lc 'export PATH="$(DEV_NODE_BIN):$$PATH"; cd "$(CURDIR)" && exec npm run dev'; \
		echo "Starting development server through launchd (log: .cache/42go-dev.log)..."; \
		for attempt in 1 2 3 4 5 6 7 8 9 10; do \
			if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then \
				echo "Development server is listening on port 3000."; \
				exit 0; \
			fi; \
			sleep 1; \
		done; \
		echo "Development server did not listen on port 3000 within 10 seconds. Log: .cache/42go-dev.log"; \
		exit 1; \
	fi

app: app.install app.start
qa: npm run qa

security.check:
	python3 "$(SECURITY_CHECK)" --build --image "$(SECURITY_IMAGE)" --fail-on-findings

security.check.draft:
	python3 "$(SECURITY_CHECK)" --build --image "$(SECURITY_IMAGE)" --draft --fail-on-findings

doctor:
	@if [ -f "$(BACKLOG_DOCTOR_LOCAL)" ]; then \
		echo "Running local backlog doctor"; \
		python3 "$(BACKLOG_DOCTOR_LOCAL)" --backlog-root "$(BACKLOG_ROOT)"; \
	elif [ -f "$(BACKLOG_DOCTOR_HOME)" ]; then \
		echo "Running home backlog doctor"; \
		python3 "$(BACKLOG_DOCTOR_HOME)" --backlog-root "$(BACKLOG_ROOT)"; \
	else \
		echo "No backlog doctor script found in .agents or $$HOME/.agents"; \
		exit 1; \
	fi

ngrok:
	ngrok http --url=42go.ngrok.app 3000

ngrok.nt:
	ngrok http --url=nt42go.ngrok.app 3000

ngrok.ql:
	ngrok http --url=ql42go.ngrok.app 3000

ngrok.lc:
	ngrok http --url=lc42go.ngrok.app 3000

###
### JS Prod Tasks
###

prod.js.start:
	yarn build
	yarn start

prod.js.ngrok:
	ngrok http --url=42go.ngrok.app 4000



###
### Production Tasks
###

prod.build:
	@echo "🏗️  Building production Docker image..."
	docker build --progress=plain --load --no-cache --build-arg APP_VERSION=$(VERSION) -f Dockerfile -t 42go-next:latest .
	@echo "✅ Production build complete"

prod.build.light:
	@echo "🏗️  Building production Docker image..."
	docker build --progress=plain --load --build-arg APP_VERSION=$(VERSION) -f Dockerfile -t 42go-next:latest .
	@echo "✅ Production build complete"

prod.start:
	@echo "🚀 Starting production environment..."
	docker compose -f docker-compose.prod.yml up -d
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@until nc -z localhost 5432; do \
		echo "PostgreSQL is unavailable - sleeping"; \
		sleep 1; \
	done
	@echo "✅ PostgreSQL is up and running!"
	@echo "⏳ Waiting for application to be healthy..."
	@sleep 10
	@until curl -f http://localhost:4000/api/health > /dev/null 2>&1; do \
		echo "Application is starting - sleeping"; \
		sleep 2; \
	done
	@echo "✅ Application is healthy and ready!"
	@echo "🌐 Production app running at: http://localhost:4000"

prod.stop:
	@echo "🛑 Stopping production environment..."
	docker compose -f docker-compose.prod.yml down
	@echo "✅ Production environment stopped"

prod.down:
	@echo "🗑️  Removing production environment and volumes..."
	docker compose -f docker-compose.prod.yml down -v
	@echo "✅ Production environment removed"

prod.logs:
	@echo "📋 Following application logs..."
	docker compose -f docker-compose.prod.yml logs -f app

prod.logs.db:
	@echo "📋 Following database logs..."
	docker compose -f docker-compose.prod.yml logs -f db

prod.health:
	@echo "🩺 Checking application health..."
	@curl -f http://localhost:4000/api/health && echo "✅ Application is healthy" || echo "❌ Application is unhealthy"

prod.clean:
	@echo "🧹 Cleaning production artifacts..."
	docker compose -f docker-compose.prod.yml down -v
	docker system prune -f
	@echo "✅ Production artifacts cleaned"



prod.app.stop:
	docker compose -f docker-compose.prod.yml stop app
	docker compose -f docker-compose.prod.yml rm -f app



prod: prod.build.light prod.start prod.init
	@echo "🎉 Production environment is ready!"
	@echo "🌐 Access the application at: http://localhost:4000"
	@echo "📋 View logs with: make prod.logs"

prod.init: migrate seed
prod.app.rebuild: prod.app.stop prod.build.light prod.start prod.logs
prod.app.restart: prod.app.stop prod.start prod.logs


###
### Publish to DockerHUB
###
publish:
	@echo "Building $(IMAGE):$(VERSION) for $(UNIVERSAL_PLATFORMS)"
	@docker buildx build --platform $(UNIVERSAL_PLATFORMS) \
		--build-arg NODE_ENV=production \
		--build-arg APP_VERSION=$(VERSION) \
		-t $(IMAGE):latest \
		-t $(IMAGE):$(VERSION) \
		--push \
		.

publish.nocache:
	@echo "Building $(IMAGE):$(VERSION) for $(UNIVERSAL_PLATFORMS) without cache"
	@docker buildx build --platform $(UNIVERSAL_PLATFORMS) \
		--no-cache \
		--build-arg NODE_ENV=production \
		--build-arg APP_VERSION=$(VERSION) \
		-t $(IMAGE):latest \
		-t $(IMAGE):$(VERSION) \
		--push \
		.

publish.universal:
	@echo "Building $(IMAGE):$(VERSION) for $(UNIVERSAL_PLATFORMS) without cache"
	@docker buildx build --platform $(UNIVERSAL_PLATFORMS) \
		--no-cache \
		--build-arg NODE_ENV=production \
		--build-arg APP_VERSION=$(VERSION) \
		-t $(IMAGE):latest \
		-t $(IMAGE):$(VERSION) \
		--push \
		.

deploy.caprover:
	@if [ -z "$$CAPROVER_URL" ]; then \
		echo "CAPROVER_URL is required. Add it to .env or pass CAPROVER_URL=https://captain.example.com"; \
		exit 1; \
	fi
	@if [ -z "$$CAPROVER_APP_TOKEN" ]; then \
		echo "CAPROVER_APP_TOKEN is required. Add it to .env or pass it in the environment"; \
		exit 1; \
	fi
	@echo "Deploying $(CAPROVER_IMAGE) to CapRover app $(CAPROVER_APP)"
	@$(CAPROVER) deploy \
		--caproverUrl "$$CAPROVER_URL" \
		--caproverApp "$(CAPROVER_APP)" \
		--imageName "$(CAPROVER_IMAGE)" \
		--appToken "$$CAPROVER_APP_TOKEN"

deploy.mac: publish
	@$(MAKE) deploy.caprover VERSION="$(VERSION)"
	@$(MAKE) verify.deployment.maybe VERSION="$(VERSION)"

deploy.nocache: publish.nocache
	@$(MAKE) deploy.caprover VERSION="$(VERSION)"
	@$(MAKE) verify.deployment.maybe VERSION="$(VERSION)"

deploy: deploy.mac

###
### Release through GitHub Actions
###
.PHONY: deploy.mac deploy.github verify.deployment verify.deployment.maybe
deploy.github:
	@python3 .agents/skills/42go-deploy/scripts/bump_patch_version.py

verify.deployment.maybe:
	@if [ "$(SKIP_DEPLOYMENT_VERIFY)" = "1" ]; then \
		echo "Skipping local deployment verification; the caller must verify the rollout"; \
	else \
		$(MAKE) verify.deployment VERSION="$(VERSION)"; \
	fi

verify.deployment:
	@expected="$(VERSION)"; \
		url="$(DEPLOYMENT_URL)"; \
		response_file="$$(mktemp)"; \
		trap 'rm -f "$$response_file"' EXIT; \
		echo "Waiting $(DEPLOYMENT_VERIFY_INITIAL_WAIT)s before verifying $$url"; \
		sleep $(DEPLOYMENT_VERIFY_INITIAL_WAIT); \
		attempt=1; \
		while [ $$attempt -le $(DEPLOYMENT_VERIFY_ATTEMPTS) ]; do \
			: > "$$response_file"; \
			http_code="$$(curl --silent --show-error --location \
				--max-time $(DEPLOYMENT_VERIFY_INTERVAL) \
				--output "$$response_file" \
				--write-out '%{http_code}' \
				"$$url?verify=$$expected-$$attempt" || true)"; \
			body="$$(tr -d '\r\n' < "$$response_file")"; \
			if [ "$$http_code" = "200" ] && [ "$$body" = "$$expected" ]; then \
				echo "Verified deployment $$expected: $$url"; \
				exit 0; \
			fi; \
			echo "Attempt $$attempt/$(DEPLOYMENT_VERIFY_ATTEMPTS): version not ready (HTTP $${http_code:-000}, body: $$body)"; \
			attempt=$$((attempt + 1)); \
			sleep $(DEPLOYMENT_VERIFY_INTERVAL); \
		done; \
		echo "Deployment verification failed after $(DEPLOYMENT_VERIFY_ATTEMPTS) attempts: $$url"; \
		exit 1



###
### DB Utilities
###

.PHONY: prod.migrate prod.migrate.idangerouslyconfirm prod.seed prod.seed.idangerouslyconfirm prod.seed.file prod.seed.file.idangerouslyconfirm prod.lc.books prod.lc.books.idangerouslyconfirm prod.lc.convs prod.lc.convs.idangerouslyconfirm

PROD_SEED_FILES := $(notdir $(wildcard knex/seeds/*.js))

define confirm_production_action
	@test -t 0 || (echo "$(1) requires an interactive terminal; use $(2) only from an approved automation workflow" && exit 1)
	@printf '\nDANGER: %s will modify the database selected by .env.prod.\n' "$(1)"
	@printf 'Type yes to continue: '; read -r confirmation; test "$$confirmation" = "yes" || (echo "Aborted." && exit 1)
endef

migrate:
	npx knex migrate:latest

prod.migrate:
	$(call confirm_production_action,prod.migrate,prod.migrate.idangerouslyconfirm)
	@$(MAKE) prod.migrate.idangerouslyconfirm

prod.migrate.idangerouslyconfirm:
	@test -f .env.prod || (echo ".env.prod is required" && exit 1)
	DOTENV_CONFIG_PATH=.env.prod npx knex --env production migrate:latest

migrate.up:
	npx knex migrate:up

migrate.down:
	npx knex migrate:down

migrate.clear:
	npx knex migrate:rollback --all

migrate.rebuild:
	npx knex migrate:rollback --all && npx knex migrate:latest

migrate.redo:
	npx knex migrate:down && npx knex migrate:up

backup:
	@if [ "$(mode)" = "full" ]; then \
		42go backup --full; \
	elif [ "$(mode)" = "light" ]; then \
		42go backup --light; \
	elif [ -z "$(mode)" ]; then \
		42go backup; \
	else \
		echo "mode must be full or light"; \
		exit 1; \
	fi

restore:
	@if [ -z "$(from)" ]; then \
		42go restore; \
	else \
		42go restore --from "$(from)"; \
	fi

events:
	@if command -v 42go >/dev/null 2>&1; then \
		42go pull events; \
	else \
		echo "42go CLI not found. Install it following the README.md 42Go CLI instructions."; \
		exit 1; \
	fi

migrate.status:
	npx knex migrate:status 

seed:
	npx knex seed:run

prod.seed:
	$(call confirm_production_action,prod.seed,prod.seed.idangerouslyconfirm)
	@$(MAKE) prod.seed.idangerouslyconfirm

prod.seed.idangerouslyconfirm:
	@test -f .env.prod || (echo ".env.prod is required" && exit 1)
	DOTENV_CONFIG_PATH=.env.prod npx knex --env production seed:run

prod.seed.file:
ifneq ($(strip $(file)),)
ifeq ($(filter $(file),$(PROD_SEED_FILES)),$(file))
	$(call confirm_production_action,prod.seed.file file=$(file),prod.seed.file.idangerouslyconfirm file=$(file))
	@$(MAKE) prod.seed.file.idangerouslyconfirm file="$(file)"
else
	@echo "file must name a committed seed in knex/seeds"
	@exit 1
endif
else
	@echo "file is required; available seeds: $(PROD_SEED_FILES)"
	@exit 1
endif

prod.seed.file.idangerouslyconfirm:
ifneq ($(strip $(file)),)
ifeq ($(filter $(file),$(PROD_SEED_FILES)),$(file))
	@test -f .env.prod || (echo ".env.prod is required" && exit 1)
	DOTENV_CONFIG_PATH=.env.prod npx knex --env production seed:run --specific="$(file)"
else
	@echo "file must name a committed seed in knex/seeds"
	@exit 1
endif
else
	@echo "file is required; available seeds: $(PROD_SEED_FILES)"
	@exit 1
endif

seed.file:
	npx knex seed:run --specific=$(file)

prod.lc.books:
	$(call confirm_production_action,prod.lc.books,prod.lc.books.idangerouslyconfirm)
	@$(MAKE) prod.lc.books.idangerouslyconfirm

prod.lc.books.idangerouslyconfirm:
	@test -f .env.prod || (echo ".env.prod is required" && exit 1)
	DOTENV_CONFIG_PATH=.env.prod npx knex --env production seed:run --specific=20260709141319.lingocafe.books.js

prod.lc.convs:
	$(call confirm_production_action,prod.lc.convs,prod.lc.convs.idangerouslyconfirm)
	@$(MAKE) prod.lc.convs.idangerouslyconfirm

prod.lc.convs.idangerouslyconfirm:
	@test -f .env.prod || (echo ".env.prod is required" && exit 1)
	DOTENV_CONFIG_PATH=.env.prod npx knex --env production seed:run --specific=20260806224000.lingocafe.conversations.js

db.start:
	@echo "Starting PostgreSQL database..."
	@docker-compose up -d db

db.wait:
	@sleep 10

db.init:
	@echo "Initializing database..."
	@npx knex migrate:latest && npx knex seed:run

db: app.install db.start db.wait db.init
	@echo "Database is ready!"
