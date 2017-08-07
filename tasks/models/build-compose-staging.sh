#!/bin/bash
RPATH="./scripts/docker"
docker-compose -f $RPATH/docker-compose.yml -f $RPATH/docker-compose-staging.yml build --no-cache && \
docker-compose -f $RPATH/docker-compose.yml -f $RPATH/docker-compose-staging.yml up -d --force-recreate