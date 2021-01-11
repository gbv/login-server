FROM node:12-alpine

WORKDIR /usr/src/app

# Install git
RUN apk add --update git

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3004

# Use pm2 to run app
RUN npm install pm2 -g

RUN mkdir /config

COPY docker/docker-entrypoint.sh /usr/local/bin/
COPY docker/.env .env

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["%%CMD%%"]
