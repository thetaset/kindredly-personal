#!/usr/bin/env bash 

source envs.sh

echo "current DB_HOSTNAME: $DB_HOSTNAME"
echo "current DB_PORT: $DB_PORT"

echo "current REDIS_HOST: $REDIS_HOST"
echo "current REDIS_PORT: $REDIS_PORT"

if [ "$NODE_ENV" == "development" ]; then

    source ".env.development"

    npm run dev
else
    npm run start
fi