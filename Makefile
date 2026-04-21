.PHONY: install lint build run test test-frontend test-backend clean

install:
	npm --prefix frontend install
	npm --prefix frontend exec playwright install --with-deps chromium
	cd backend && pip install pdm && pdm install

lint:
	npm --prefix frontend run lint
	cd backend && pdm run ruff check .

build:
	docker compose build

run:
	docker compose up

test-frontend:
	npm --prefix frontend run test

test-backend:
	cd backend && pdm run pytest

test: test-frontend test-backend

clean:
	docker compose down -v
