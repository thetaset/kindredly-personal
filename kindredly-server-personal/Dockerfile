# Common build stage
FROM node:21.6.2-bullseye

RUN apt-get update && apt-get install -y \
    dnsutils \
 && rm -rf /var/lib/apt/lists/*

# Create app directory
RUN mkdir -p /app
RUN mkdir -p /app/tset-sharedlib
RUN mkdir -p /app/kindredly-server-personal

WORKDIR /app

RUN npm install -g npm@10.5.0

RUN npm install -g knex
RUN npm install -g cross-env
RUN npm install -g nodemon
RUN npm install -g ts-node
RUN npm install -g tsconfig-paths

# Shared Deps and code build
COPY tset-sharedlib /app/tset-sharedlib
WORKDIR /app/tset-sharedlib
RUN npm install --production=false
RUN chown -R 1000:1000 "/root/.npm"
RUN npm run build

# Server Deps
COPY kindredly-server-personal/package.json kindredly-server-personal/package-lock.json* /app/kindredly-server-personal/
WORKDIR /app/kindredly-server-personal
RUN npm install --production=false
RUN chown -R 1000:1000 "/root/.npm"

# Server code build
COPY kindredly-server-personal /app/kindredly-server-personal
RUN npm run build


# ENV NODE_ENV production
ARG NODE_ENV production
ENV NODE_ENV $NODE_ENV


EXPOSE 3000

# Start the application based on NODE_ENV
# CMD ["node", "dist/server.js"]; \
CMD if [ "$NODE_ENV" = "development" ]; then \
      echo "DEV MODE"; \
      npm run dev; \
    else \
        node dist/server.js; \
    fi


