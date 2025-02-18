#!/bin/bash
make build
scp swagger-guard-server root@myaws:/var/www/swagger-guard/server/swagger-guard-server-latest
ssh root@myaws "cd /var/www/swagger-guard/server && rm -f swagger-guard-server && mv swagger-guard-server-latest swagger-guard-server && pm2 restart swagger-guard-server"