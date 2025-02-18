#!/bin/bash
rm build.zip
npm run build
zip -r build.zip build
scp build.zip root@myaws:/var/www/swagger-guard/swagger-ui/build.zip
ssh root@myaws "cd /var/www/swagger-guard/swagger-ui && rm -rf build && unzip build.zip && rm build.zip"
echo "Build completed"