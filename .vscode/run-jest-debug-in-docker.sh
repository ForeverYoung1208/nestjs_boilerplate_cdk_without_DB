#!/bin/bash
LOCAL_PATH="$2"
# Replace the absolute local path with the Docker's project path (/app)
if [[ "$LOCAL_PATH" == */src/* ]]; then
    DOCKER_PATH="/app/src/${LOCAL_PATH##*/src/}"
elif [[ "$LOCAL_PATH" == */test/* ]]; then
    DOCKER_PATH="/app/test/${LOCAL_PATH##*/test/}"
fi
shift
docker compose -f docker/docker-comopose.yml exec api node --inspect=0.0.0.0:9230 ./node_modules/.bin/jest "$DOCKER_PATH" "$@" --detectOpenHandles