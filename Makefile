.PHONY: all dev build start test lint format clean docker-dev docker-prod docker-down help install pre-commit-install validate

# Variables
APP_NAME := rediver-ui
COMPOSE_BASE := docker-compose.yml
COMPOSE_PROD := docker-compose.prod.yml

# Node/npm commands
NPM := npm
NPM_RUN := $(NPM) run

## help: Show this help message
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'

## all: Run validation (type-check, lint, format-check)
all: validate

## install: Install dependencies
install:
	@echo "Installing dependencies..."
	$(NPM) install
	@echo "Dependencies installed"

## dev: Start development server
dev:
	@echo "Starting development server..."
	$(NPM_RUN) dev

## build: Build production bundle
build:
	@echo "Building production bundle..."
	$(NPM_RUN) build

## start: Start production server
start:
	@echo "Starting production server..."
	$(NPM_RUN) start

## test: Run tests
test:
	@echo "Running tests..."
	$(NPM_RUN) test

## test-ui: Run tests with UI
test-ui:
	@echo "Running tests with UI..."
	$(NPM_RUN) test:ui

## test-coverage: Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	$(NPM_RUN) test:coverage

## test-watch: Run tests in watch mode
test-watch:
	@echo "Running tests in watch mode..."
	$(NPM_RUN) test:watch

## lint: Run linter
lint:
	@echo "Running linter..."
	$(NPM_RUN) lint

## lint-fix: Run linter with auto-fix
lint-fix:
	@echo "Running linter with auto-fix..."
	$(NPM_RUN) lint:fix

## format: Format code
format:
	@echo "Formatting code..."
	$(NPM_RUN) format

## format-check: Check code formatting
format-check:
	@echo "Checking code formatting..."
	$(NPM_RUN) format:check

## type-check: Run TypeScript type checking
type-check:
	@echo "Running type checker..."
	$(NPM_RUN) type-check

## validate: Run all validation checks (type-check, lint, format-check)
validate:
	@echo "Running validation..."
	$(NPM_RUN) validate

## analyze: Analyze bundle size
analyze:
	@echo "Analyzing bundle..."
	$(NPM_RUN) analyze

## clean: Clean build artifacts and dependencies
clean:
	@echo "Cleaning..."
	@rm -rf .next
	@rm -rf node_modules
	@rm -rf out
	@rm -rf coverage
	@echo "Clean complete"

## docker-dev: Start development environment with Docker
docker-dev:
	@echo "Starting development environment..."
	docker compose -f $(COMPOSE_BASE) up --build

## docker-dev-d: Start development environment in background
docker-dev-d:
	@echo "Starting development environment (detached)..."
	docker compose -f $(COMPOSE_BASE) up -d --build

## docker-prod: Start production environment
docker-prod:
	@echo "Starting production environment..."
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) up -d --build

## docker-down: Stop all Docker Compose services
docker-down:
	@echo "Stopping services..."
	docker compose -f $(COMPOSE_BASE) down 2>/dev/null || true
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) down 2>/dev/null || true

## docker-logs: View Docker Compose logs
docker-logs:
	docker compose -f $(COMPOSE_BASE) logs -f 2>/dev/null || \
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) logs -f

## docker-ps: Show running containers
docker-ps:
	docker compose -f $(COMPOSE_BASE) ps 2>/dev/null || \
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) ps

## docker-clean: Remove all containers, volumes, and images
docker-clean:
	@echo "Cleaning Docker resources..."
	docker compose -f $(COMPOSE_BASE) down -v --rmi local 2>/dev/null || true
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) down -v --rmi local 2>/dev/null || true

# =============================================================================
# PRE-COMMIT & LINTING
# =============================================================================

## pre-commit-install: Install pre-commit hooks
pre-commit-install:
	@echo "Installing pre-commit hooks..."
	@if ! command -v pre-commit >/dev/null 2>&1; then \
		echo "Installing pre-commit..."; \
		if command -v apt-get >/dev/null 2>&1; then \
			if ! command -v pip >/dev/null 2>&1; then \
				echo "Installing pip first..."; \
				sudo apt-get update && sudo apt-get install -y python3-pip; \
			fi; \
			pip install --break-system-packages pre-commit; \
		else \
			brew install pre-commit; \
		fi; \
	fi
	@echo "Note: This project uses Husky for git hooks."
	@echo "Run 'npm install' to set up Husky hooks automatically."
	@echo "If you want to use pre-commit instead, create a .pre-commit-config.yaml file."

## husky-install: Install Husky git hooks
husky-install:
	@echo "Installing Husky hooks..."
	$(NPM) install
	@echo "Husky hooks installed"

## pre-commit-run: Run all pre-commit hooks (if configured)
pre-commit-run:
	@if [ -f ".pre-commit-config.yaml" ]; then \
		echo "Running pre-commit hooks..."; \
		pre-commit run --all-files; \
	else \
		echo "No .pre-commit-config.yaml found. This project uses Husky."; \
		echo "Run 'make validate' instead."; \
	fi
