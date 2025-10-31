#!/bin/bash
LOCAL_PATH="$1"
# Replace the absolute local path with the Docker's project path (/app)

if [[ "$LOCAL_PATH" == */src/* ]]; then
    DOCKER_PATH="/app/src/${LOCAL_PATH##*/src/}"
elif [[ "$LOCAL_PATH" == */test/* ]]; then
    DOCKER_PATH="/app/test/${LOCAL_PATH##*/test/}"
fi

shift
docker compose -f docker/docker-comopose.yml exec api npx jest "$DOCKER_PATH" "$@" --detectOpenHandles