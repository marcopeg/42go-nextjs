###
### Development Utilities
###

boot: app.install start migrate seed app.start

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
clear: down app.clear
	docker-compose down -v
	rm -rf node_modules
	rm -rf .next
	rm -rf .cache

app.clear:
	rm -rf node_modules
	rm -rf .next
	rm -rf .cache

app.install:
	npm install --legacy-peer-deps

app.start:
	npm run dev

app: app.install app.start
qa: npm run qa

###
### Production Tasks
###

prod.build:
	@echo "🏗️  Building production Docker image..."
	docker build --progress=plain --no-cache -f Dockerfile -t 42go-next:latest .
	@echo "✅ Production build complete"

prod.build.light:
	@echo "🏗️  Building production Docker image..."
	docker build --progress=plain -f Dockerfile -t 42go-next:latest .
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

prod.init: migrate seed

prod.re: prod.build.light prod.start

prod: prod.build prod.start prod.init
	@echo "🎉 Production environment is ready!"
	@echo "🌐 Access the application at: http://localhost:4000"
	@echo "📋 View logs with: make prod.logs"


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