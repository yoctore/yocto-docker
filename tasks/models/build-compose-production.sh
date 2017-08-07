#!/bin/bash
RPATH="./scripts/docker"
docker-compose -f $RPATH/docker-compose.yml -f $RPATH/docker-compose-production.yml build --no-cache && \
docker-compose -f $RPATH/docker-compose.yml -f $RPATH/docker-compose-production.yml up -d --force-recreate