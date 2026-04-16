.PHONY: install lint build test

install:
	npm --prefix frontend install
	npm --prefix frontend exec playwright install --with-deps chromium

lint:
	npm --prefix frontend run lint

build:
	npm --prefix frontend run build

test:
	npm --prefix frontend run test
