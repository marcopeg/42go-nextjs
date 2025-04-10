###
### Development Utilities
###

boot: next.install start migrate seed
	npm run dev

reboot: clear boot

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
clear: down next.clear
	docker-compose down -v
	rm -rf node_modules
	rm -rf .next
	rm -rf .cache

next.clear:
	rm -rf node_modules
	rm -rf .next
	rm -rf .cache

next.install:
	npm install --legacy-peer-deps

next: next.install
	npm run dev


###
### Production Tasks
###

prod.build:
	docker compose -f docker-compose.prod.yml build --no-cache

prod.start:
	docker compose -f docker-compose.prod.yml up -d
	@echo "Waiting for PostgreSQL to be ready..."
	@until nc -z localhost 5432; do \
		echo "PostgreSQL is unavailable - sleeping"; \
		sleep 1; \
	done
	@echo "PostgreSQL is up and running!"

prod.stop:
	docker compose -f docker-compose.prod.yml down

prod.down:
	docker compose -f docker-compose.prod.yml down -v

prod.logs:
	docker compose -f docker-compose.prod.yml logs -f app

prod: prod.build prod.start migrate seed prod.logs


###
### DB Utilities
###

migrate:
	npx knex migrate:latest

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

migrate.status:
	npx knex migrate:status 

seed:
	npx knex seed:run