# app name should be overridden.
# ex) production-stage: make build APP_NAME=<APP_NAME>
# ex) development-stage: make build-dev APP_NAME=<APP_NAME>

APP_NAME = kindredly-server
APP_NAME := $(APP_NAME)

.PHONY: build


# Build the container image - Production
build: 
	docker build --no-cache -t ${APP_NAME}\
		-f Dockerfile .

# Clean the container image
clean:
	docker rmi -f ${APP_NAME}

# Run the container image
run:
	docker run -d -it -p 3000:3000 ${APP_NAME}

all: build
