# Kindredly Personal Edition

Kindredly Personal Edition is a free, open-source, and self-hosted version of Kindredly designed for individuals and families.

> **NOTE:** Personal Edition is a work in progress. Documentation is limited and will be updated soon.

## Requirements
- docker (https://docs.docker.com/get-docker/)
- docker-compose (https://docs.docker.com/compose/)

## Installation 
1. Clone the repository
1. Run `./build_docker_personal.sh`
1. Run `./start_server_personal.sh` (this will fail, but will setup the database)
1. Run `./start_server_personal.sh` (run again)
1. Visit to http://localhost:4444

## Setup Extensions to use your Personal Server
- Go to custom server settings and give IP address and port of the server (http://localhost:4444/api/v2.3)

