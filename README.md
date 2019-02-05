# Cocoda Login

[![Build Status](https://travis-ci.com/gbv/cocoda-login.svg?branch=master)](https://travis-ci.com/gbv/cocoda-login)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> Login server for Cocoda Mapping Tool

This repository offers a login server to be used with the [Cocoda Mapping Tool](https://github.com/gbv/cocoda).

## Table of Contents

- [Install](#install)
  - [Dependencies](#dependencies)
  - [Clone and Install](#clone-and-install)
  - [Configuration](#configuration)
- [Usage](#usage)
- [Test](#test)
- [API](#api)
  - [GET /users](#get-users)
  - [GET /users/:id](#get-usersid)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Install

### Dependencies
You need to have access to a [MongoDB database](https://docs.mongodb.com/manual/installation/).

### Clone and Install
```bash
git clone https://github.com/gbv/cocoda-login.git
cd cocoda-login
npm install
```

### Configuration
You also need to provide two configuration files:

#### `.env`
To configure the application:

```bash
# required, port for express
PORT=
# recommended, full base URL without trailing slash, default: http://localhost[:PORT]
BASE_URL=
# recommended, default: development
NODE_ENV=
# recommended, secret used by the session
SESSION_SECRET=
# username used for MongoDB, default: <empty>
MONGO_USER=
# password used for MongoDB, default: <empty>
MONGO_PASS=
# host used for MongoDB, default: localhost
MONGO_HOST=
# port used for MongoDB, default: 27017
MONGO_PORT=
# database used for MongoDB, default: cocoda-login
MONGO_DB=
```

#### `config/providers.json`
To configure the providers:

```json
[
  {
    "id": "github",
    "name": "GitHub",
    "auth": {
      "clientID": "abcdef1234567890",
      "clientSecret": "abcdef1234567890abcdef1234567890"
    }
  }
]
```

For each provider, the `id` is the name used by the corresponding passport strategy, the `name` is the display name, and `auth` will be inserted into the options when configuring the strategy (most applications need `clientID` and `clientSecret`, but for example Mediawiki needs `consumerKey` and `consumerSecret`).

You can only use providers available in folder `strategies/`. Feel free to add more providers via Pull Request (please use existing files as templates).

## Usage
```bash
npm run start
```

## Test
Not yet implemented.

```bash
npm test
```

## API
To be extended.

### GET /users
Returns all users in database. Note: This may be removed in the future.

### GET /users/:id
Returns a specific user.

## Maintainers

- [@stefandesu](https://github.com/stefandesu)
- [@nichtich](https://github.com/nichtich)

## Contribute
PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License
MIT © 2019 Verbundzentrale des GBV (VZG)
