#!/bin/bash

docker build -t dummy-healthcheck .
docker tag dummy-healthcheck:latest p6hi/service-x-repository:dummy-healthcheck
docker push p6hi/service-x-repository:dummy-healthcheck
echo "Pushed image p6hi/service-x-repository:dummy-healthcheck"
