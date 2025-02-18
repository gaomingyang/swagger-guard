.PHONY: build

build:
	if [ ! -d uploads ]; then mkdir uploads; fi
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o swagger-guard-server main.go
	@echo "build successfully!"