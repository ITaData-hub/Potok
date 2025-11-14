.PHONY: install dev build docker-up docker-down migrate test

install:
	npm install

dev:
	npm run start:dev

build:
	npm run build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down -v

migrate:
	npm run migration:run

migrate-rollback:
	npm run migration:revert

test:
	npm run test

test-cov:
	npm run test:cov

logs:
	docker-compose logs -f admin-service

k8s-deploy:
	kubectl apply -f k8s/

k8s-delete:
	kubectl delete -f k8s/

k8s-logs:
	kubectl logs -f -l app=admin-service -n potok
