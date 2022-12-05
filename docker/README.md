# [Login Server](https://github.com/gbv/login-server)
[![Build Status](https://travis-ci.com/gbv/login-server.svg?branch=master)](https://travis-ci.com/gbv/login-server)

This repository offers a login server to be used with the [Cocoda Mapping Tool](https://github.com/gbv/cocoda). It allows users to authenticate using different providers (e.g. GitHub, ORCID). It is part of a larger infrastructure of [Project coli-conc](https://coli-conc.gbv.de).

- See [GitHub](https://github.com/gbv/login-server) for more information about the tool.

## Supported Architectures
Currently, only `x86-64` is supported, but we are planning to add more architectures soon.

## Available Tags
- The current release version is available under `latest`. However, new major versions might break compatibility of the previously used config file, therefore it is recommended to use a version tag instead.
- We follow SemVer for versioning the application. Therefore, `x` offers the latest image for the major version x, `x.y` offers the latest image for the minor version x.y, and `x.y.z` offers the image for a specific patch version x.y.z.
- Additionally, the latest development version is available under `dev`.

## Usage
It is recommended to run the image using [Docker Compose](https://docs.docker.com/compose/) together with the required MongoDB database. Note that depending on your system, it might be necessary to use `sudo docker compose`. For older Docker versions, use `docker-compose` instead of `docker compose`.

1. Create `docker-compose.yml`:

```yml
version: "3"

services:
  login-server:
    image: coliconc/login-server
    # replace this with your UID/GID if necessary (id -u; id -g); remove on macOS/Windows
    user: 1000:1000
    depends_on:
      - mongo
    volumes:
      - ./data/config:/config
      - ./data/static:/usr/src/app/static # if required
    environment:
      - MONGO_HOST=mongo
    ports:
      - 3004:3004
    restart: always

  mongo:
    image: mongo:4
    # replace this with your UID/GID if necessary (id -u; id -g); remove on macOS/Windows
    user: 1000:1000
    volumes:
      - ./data/db:/data/db
    restart: always
```

2. Create data folders:

```bash
mkdir -p ./data/{config,static,db}
```

3. Start the application:

```bash
docker compose up -d
```

This will create and start a login-server container running under host port 3004 with data persistence under `./data`:

- `./data/config`: configuration files required for login-server (in particular: `private.key`, `public.key`, and `providers.json`), see below
- `./data/static`: static files, e.g. for provider images
- `./data/db`: data of the MongoDB container (note: make sure MongoDB data persistence works with your system, see section "Where to Store Data" [here](https://hub.docker.com/_/mongo))

Note that the `user` directives in the compose file make sure that the generated files are owned by your host user account. Use `id -u`/`id -g` to find out your UID/GID respectively, or remove the directives if you are using Docker on macOS/Windows.

You can now access the application under `http://localhost:3004`.

## Application Setup
Note: After adjusting any configurations, it is required to restart or recreate the container:
- After changing configuration files or static files, restart the container: `docker compose restart login-server`
- After changing `docker-compose.yml` (e.g. adjusting environment variables), recreate the container: `docker compose up -d`

### Configuration Files
The folder `/config` (mounted as `./data/config` if configured as above) contains three important files related to the configuration of login-server:
- `private.key`: The RSA private key used to generate JWTs. If not provided, login-server will generate a keypair for you.
- `public.key`: The RSA public key that is used to decode JWTs. This is supposed to be shared with other applications. If not provided, login-server will generate a keypair for you.
- `providers.json`: A list (= JSON array) of configured providers. Please refer to the [GitHub README](https://github.com/gbv/login-server#providers) on how to configure providers. An empty providers.json file will be created on first startup; however, as there will be no providers available, login-server will not be usable without configuring at least one provider.

It is possible to configure local providers (i.e. authentication using username/password). Please use the included script for this:
```bash
docker compose exec login-server /usr/src/app/bin/manage-local.js
```

After adjusting the providers (either via the script or by editing `providers.json`), Login Server has to be restarted:
```bash
docker compose exec login-server pm2 restart server
```

### Environment Variables
There are a number of environment variables that can be used to configure login-server. The following is a selection of usual environment variables:

| Environment Variable | Description                                                                                                                      | Example Value               |
|----------------------|----------------------------------------------------------------------------------------------------------------------------------|-----------------------------|
| `BASE_URL`           | Full base URL of the application. Required when used behind reverse proxy or when using a different host port.                   | https://example.com/login/  |
| `TITLE`              | Title of application (shown in header)                                                                                           | My Login Server             |
| `ALLOWED_ORIGINS`    | List of allowed origins separated by comma. Provide the domain origins of all your applications that will use login-server here. | https://example.com         |
| `NODE_ENV`           | Should be set to `production` if used in production.                                                                             | production                  |
| `SESSION_SECRET`     | Secret used to secure sessions.                                                                                                  | some-random-string          |
| `IMPRINT_URL`        | Strongly recommended: URL to your imprint                                                                                        | https://example.com/imprint |
| `PRIVACY_URL`        | Strongly recommended: URL to your privacy policy                                                                                 | https://example.com/privacy |

The full list of environment variables can be found [here](https://github.com/gbv/login-server#env). Depending on your MongoDB configuration, you might need to adjust the respective variables. Please do not override `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`, and `PROVIDERS_PATH`, as these refer to files inside the container.

### Database Indexes
If you expect a large number of users on your login-server, it is recommended to add indexes to the users table. After configuring your providers, please use the following script:
```bash
docker compose exec login-server node /usr/src/app/utils/addIndexes.js
```
