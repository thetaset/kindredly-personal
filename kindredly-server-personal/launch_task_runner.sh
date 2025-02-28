#!/usr/bin/env bash 
source envs.sh

echo "RUNNING TASKRUNNER for $NODE_ENV"

if [ "$NODE_ENV" = "development" ]; then
    echo "RUNNING TASKRUNNER DEV"
    source ".env.development"

    npm run start-task_runner-dev
    exit 0
else
    npm run start-task_runner
fi