#!/usr/bin/env bash 
source envs.sh
if [ "$NODE_ENV" == "development" ]; then

    source ".env.development"

fi
echo "RUNNING DB Creation"
npm run db:create
echo "DONE DB Creation"