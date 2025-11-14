.PHONY: help install dev build test docker-build docker-up docker-down clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Run in development mode
	npm run start:dev

build: ## Build for production
	npm run build

test: ## Run tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-cov: ## Run tests with coverage
	npm run test:cov

docker-build: ## Build Docker image
	docker build -t state-management-service:latest .

docker-up: ## Start services with Docker Compose
	docker-compose up -d

docker-down: ## Stop services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f state-management-service

clean: ## Clean build artifacts
	rm -rf dist node_modules coverage

redis-cli: ## Connect to Redis CLI
	docker-compose exec redis redis-cli

format: ## Format code
	npm run format

lint: ## Lint code
	npm run lint
