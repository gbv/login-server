FROM node:20-alpine

WORKDIR /usr/src/app

# Install Bash (mostly for script strategy)
RUN apk add --no-cache bash

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Bundle app source
COPY . .

EXPOSE 3004

RUN mkdir /config
COPY docker/.env .env

# Use pm2 to run app
RUN npm i -g pm2

CMD ["pm2-runtime", "server.js"]
