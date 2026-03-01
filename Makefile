.PHONY: build up down logs restart clean help

# Default target
help:
	@echo "MCP Unified Docker Commands:"
	@echo "  make build     - Build Docker images"
	@echo "  make up        - Start containers"
	@echo "  make down      - Stop containers"
	@echo "  make logs      - View logs"
	@echo "  make restart   - Restart containers"
	@echo "  make clean     - Remove containers and volumes"
	@echo "  make dev       - Start in development mode"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

restart:
	docker-compose restart

clean:
	docker-compose down -v
	docker system prune -f

dev:
	docker-compose -f docker-compose.dev.yml up

stop:
	docker-compose stop

start:
	docker-compose start

ps:
	docker-compose ps
