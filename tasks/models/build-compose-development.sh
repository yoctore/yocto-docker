#!/bin/bash
RPATH="./scripts/docker"
docker-compose -f $RPATH/docker-compose.yml -f $RPATH/docker-compose-development.yml build --no-cache && \
docker-compose -f $RPATH/docker-compose.yml -f $RPATH/docker-compose-development.yml up -d --force-recreate