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
  - [WebSocket](#websocket)
  - [GET /providers](#get-providers)
  - [GET /currentUser](#get-currentuser)
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
    "template": "https://github.com/{username}",
    "auth": {
      "clientID": "abcdef1234567890",
      "clientSecret": "abcdef1234567890abcdef1234567890"
    }
  }
]
```

For each provider, the `id` is the name used by the corresponding passport strategy, the `name` is the display name, `template` is used to generate a URI for the user (available placeholders are `{username}` and `{id}`), and `auth` will be inserted into the options when configuring the strategy (most applications need `clientID` and `clientSecret`, but for example Mediawiki needs `consumerKey` and `consumerSecret`).

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

### WebSocket
Offers a WebSocket that sends events about the current user. Events are sent as JSON-encoded strings that look like this:

```json
{
  "type": "name of event (see below)",
  "date": "(Date as ISOString)",
  "data": {
    "user": {
      "uri": "URI of user",
      "name": "Name of user",
      "identities": {
        "xzy": {
          "id": "ID of user for provider xzy",
          "uri": "URI or profile URL of user for provider xzy",
          "name": "Display name of user for provider xzy (if available)",
          "username": "Username of user for provider xzy (if available)"
        }
      },
      "rights": ["a", "list", "of", "rights"]
    }
  }
}
```

Available event types are:
- `loggedIn` - sent when the user has logged in (will be sent immediately after establishing the WebSocket if the user is already logged in)
- `loggedOut` - sent when the user has logged out
- `updated` - sent when the user was updated (e.g. added a new identity, etc.)
- `providers` - sent as answer to a providers request via the WebSocket (consists of a property `data.providers` with a list of available providers)
- `error` - sent as answer to a malformed message via the WebSocket (consists of a property `data.message` with an error message)

You can also send requests to the WebSocket. These also have to be JSON-encoded strings in the following form:

```json
{
  "type": "name of request"
}
```

Currently available request types are:
- `providers` - returns a list of available providers (same as [GET /providers](#get-providers))

#### Example Usage
```javascript
// Assumes server is run on localhost:3005
let socket = new WebSocket("ws://localhost:3005")
socket.addEventListener("message", (message) => {
  try {
    let event = JSON.parse(message)
    alert(event.event, event.user && event.user.uri)
  } catch(error) {
    console.warn("Error parsing WebSocket message", message)
  }
})
```

### GET /providers
Returns a list of available providers.

### GET /currentUser
Returns the currently logged in user. Returns an 404 error when no user is logged in.

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
