#!/usr/bin/env bash 
source envs.sh
if [ "$NODE_ENV" == "development" ]; then

    source ".env.development"

fi

npm install

if [ "$MIGRATE_OPTION" == "create" ]; then
    echo "RUNNING DB Creation"
    npm run db:create
    echo "DONE DB Creation"
else
    MIGRATE_OPTION="${MIGRATE_OPTION:-latest}"
    echo "RUNNING MIGRATION"
    knex migrate:${MIGRATE_OPTION} --knexfile knex/knexfile.ts
    echo "DONE WITH MIGRATION"
fi