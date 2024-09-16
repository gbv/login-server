# Login Server
[![GitHub release](https://img.shields.io/github/release/gbv/login-server.svg)](https://github.com/gbv/login-server/releases/latest)
[![API Status](https://coli-conc-status.fly.dev/api/badge/2/status?label=API)](https://coli-conc.gbv.de/api/)
[![License](https://img.shields.io/github/license/gbv/login-server.svg)](https://github.com/gbv/login-server/blob/master/LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fgbv%2Flogin--server-informational)](https://github.com/gbv/login-server/blob/master/docker/README.md)
[![Test](https://github.com/gbv/login-server/actions/workflows/test.yml/badge.svg)](https://github.com/gbv/login-server/actions/workflows/test.yml)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

This repository offers a login server to be used with the [Cocoda Mapping Tool](https://github.com/gbv/cocoda). It allows users to authenticate using different providers (e.g. GitHub, ORCID). See <https://coli-conc.gbv.de/login/api> for an example on how you could use this.

## Table of Contents <!-- omit in toc -->

- [Install](#install)
  - [Dependencies](#dependencies)
  - [Clone and Install](#clone-and-install)
  - [Docker](#docker)
  - [Configuration](#configuration)
    - [`.env`](#env)
    - [`providers.json`](#providersjson)
    - [`applications.json`](#applicationsjson)
- [Usage](#usage)
- [Test](#test)
- [Strategies](#strategies)
  - [Providers](#providers)
- [JWTs](#jwts)
- [Web interface](#web-interface)
  - [GET /](#get-)
  - [GET /account](#get-account)
  - [GET /sessions](#get-sessions)
  - [GET /login](#get-login)
  - [GET /login/:provider](#get-loginprovider)
  - [POST /login/:provider](#post-loginprovider)
  - [GET /disconnect/:provider](#get-disconnectprovider)
  - [GET /logout](#get-logout)
  - [GET /delete](#get-delete)
  - [POST /delete](#post-delete)
- [OAuth endpoint](#oauth-endpoint)
  - [GET /login/:provider/return](#get-loginproviderreturn)
- [HTTP API](#http-api)
  - [GET /about](#get-about)
  - [GET /providers](#get-providers)
  - [GET /currentUser](#get-currentuser)
  - [GET /users/:id](#get-usersid)
  - [PATCH /users/:id](#patch-usersid)
  - [DELETE /sessions](#delete-sessions)
  - [DELETE /sessions/:id](#delete-sessionsid)
  - [GET /token](#get-token)
- [WebSocket](#websocket)
  - [Event types](#event-types)
  - [Authenticate request](#authenticate-request)
  - [Example Usage](#example-usage)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
  - [Publish](#publish)
- [Related Works](#related-works)
- [License](#license)

## Install

### Dependencies
login-server requires Node.js (>= v18, v20 recommended) and access to a [MongoDB database](https://docs.mongodb.com/manual/installation/) (>= v5, v7 recommended).

### Clone and Install
```bash
git clone https://github.com/gbv/login-server.git
cd login-server
npm install
# after setting up or changing providers, create indexes
npm run indexes
```

### Docker
login-server is also available via Docker. Please refer to the documentation at https://github.com/gbv/login-server/blob/master/docker/README.md for more details.

### Configuration

If running the server behind a reverse proxy, make sure to include the  `X-Forwarded-Proto` header, allow all HTTP methods, and enable WebSocket proxying.

You need to provide two configuration files:

#### `.env`
To configure the application:

```bash
# recommended, port for express, default: 3004
PORT=
# recommended, full base URL, default: http://localhost[:PORT]/
# (required when used in production or behind a reverse proxy)
BASE_URL=
# title of application (will be shown in header)
TITLE=My Login Server
# list of allowed origins separated by comma, includes the hostname of BASE_URL by default
ALLOWED_ORIGINS=
# required for some strategies to enable production mode, default: development
NODE_ENV=production
# strongly recommended, imprint and privacy URLs for footer and clients
IMPRINT_URL=
PRIVACY_URL=
# recommended, secret used by the session
SESSION_SECRET=
# optional, maximum number of days a session is valid (rolling), default: 30
COOKIE_MAX_DAYS=
# threshold in minutes when to send "sessionAboutToExpire" events, default: 60
SESSION_EXPIRATION_MESSAGE_THRESHOLD=
# interval in minutes in which to check for expiring sessions, default: 5
SESSION_EXPIRATION_MESSAGE_INTERVAL=
# username used for MongoDB, default: <empty>
MONGO_USER=
# password used for MongoDB, default: <empty>
MONGO_PASS=
# host used for MongoDB, default: 127.0.0.1
MONGO_HOST=
# port used for MongoDB, default: 27017
MONGO_PORT=
# database used for MongoDB, default: login-server
MONGO_DB=
# the rate limit window in ms, default: 60 * 1000
RATE_LIMIT_WINDOW=
# the rate limit tries, default: 10
RATE_LIMIT_MAX=
# a jsonwebtoken compatible keypair
JWT_PRIVATE_KEY_PATH=
JWT_PUBLIC_KEY_PATH=
# the jsonwebtoken algorithm used
JWT_ALGORITHM=
# expiration time of JWTs in seconds, default: 120, min: 10
JWT_EXPIRES_IN=
# URL for Sources, default: https://github.com/gbv/login-server
SOURCES_URL=
# the path to the providers.json file, default: ./providers.json
PROVIDERS_PATH=
# log = log all messages, warn = only log warnings and errors, error = only log errorsl default: log
VERBOSITY=
```

#### `providers.json`
To configure the providers. See [Providers](#providers).

#### `applications.json`
To provide the user with information about which applications are accessing their data, and which application initiated a session's login, you can provide a list of applications in `applications.json`. The list has to be an array of objects and each objects needs to have a `url` and `name`. Example:

```json
[
  {
    "url": "https://bartoc.org",
    "name": "BARTOC"
  },
  {
    "url": "https://coli-conc.gbv.de/coli-rich/",
    "name": "coli-rich"
  },
  {
    "url": "https://coli-conc.gbv.de/cocoda/app/",
    "name": "Cocoda"
  },
  {
    "url": "https://coli-conc.gbv.de/cocoda/dev/",
    "name": "Cocoda (dev)"
  },
  {
    "url": "https://coli-conc.gbv.de/cocoda/rvk/",
    "name": "Cocoda (RVK)"
  },
  {
    "url": "https://coli-conc.gbv.de/cocoda/wikidata/",
    "name": "Cocoda (Wikidata)"
  },
  {
    "url": "https://coli-conc.gbv.de/cocoda/",
    "name": "Cocoda (other)"
  },
  {
    "url": "https://coli-conc.gbv.de",
    "name": "Other coli-conc application"
  }
]
```

The URL should be accessible because the interface will link to it. A session is associated with an application if its referrer URL contains the application's `url`. Applications will be checked from top to bottom, so you should order it from most specific URL to least specific URL (see example above).

## Usage
```bash
npm run start
```

The server provides a [web interface](#web-interface), a [HTTP API](#http-api) and a [WebSocket](#websocket).

The web interface allows users to create and manage accounts with connections to multiple identities at identity providers (see [providers](#providers)). Providers are used to authenticate users because the login server does not store any passwords (single sign-on).

The HTTP API and WebSocket allow client applications to interact with the login server, for instance to check whether a user has been logged in and to find out which identities belong to a user (see [login-client](https://github.com/gbv/login-client) and [login-client-vue](https://github.com/gbv/login-client-vue) for a JavaScript libraries to connect web applications with login-server).

The login server can further be used to authenticate users against other services so users can proof their identities.

Directory [`bin`](bin) contains helper script for administration of a server instance such as listing user accounts and managing local providers.

## Test
Tests use the same MongoDB as configured in `.env`, just with the postfix `-test` after the database name.

```bash
npm test
```

## Strategies
login-server uses [Passport](http://www.passportjs.org) ([GitHub](https://github.com/jaredhanson/passport)) as authentication middleware. Passport uses so-called "strategies" to support authentication with different providers. A list of available strategies can be found [here](https://github.com/jaredhanson/passport/wiki/Strategies). Currently supported strategies in login-server are:

- GitHub (via [passport-github](http://www.passportjs.org/packages/passport-github/))
- ORCID (via [passport-orcid](http://www.passportjs.org/packages/passport-orcid/))
- Mediawiki (via [passport-mediawiki-oauth](http://www.passportjs.org/packages/passport-mediawiki-oauth/))
- LDAP (via [passport-ldapauth](http://www.passportjs.org/packages/passport-ldapauth/))
- Stack Exchange (via [passport-oauth2](https://www.passportjs.org/packages/passport-oauth2/))
- easydb (via [passport-easydb](https://github.com/gbv/passport-easydb))
- Local (via [passport-local](http://www.passportjs.org/packages/passport-local/))
- Script (see https://github.com/gbv/login-server/issues/117)

Because strategies use different parameters in their [verify callbacks](http://www.passportjs.org/docs/configure/), each strategy has its own wrapper file in the folder `strategies/`. To add another strategy to login-server, add a file called `{name}.js` (where `{name}` is the name of the strategy that is used with `passport.authenticate`) with the following structure (GitHub as example):

```javascript
/**
 * OAuth Stategy for GitHub.
 */

// Import strategy here
import { Strategy } from "passport-github"

// Don't change this part!
export default (options, provider, callback) => new Strategy(options,
    // Strategies have different callback parameters.
    // `req` is always the first and the `done` callback is always last.
    (req, token, tokenSecret, profile, done) => {
      // Prepare a standardized object for the user profile,
      // usually using information from the `profile` parameter
      let providerProfile = {
        // Required, don't change this!
        provider: provider.id,
        // Required: Choose a field that represents a unique user ID for this user
        id: profile.id,
        // Optional: Provides a display name (e.g. full name)
        name: profile.displayName,
        // Optional: Provides a username
        username: profile.username
      }
      // Call a custom callback. `req`, `providerProfile`, and `done` are required,
      // `token` and `tokenSecret` can be null.
      callback(req, token, tokenSecret, providerProfile, done)
  })
```

You can look at the existing strategies as examples and add your own via a Pull Request.

### Providers

After you have added the strategy, you can use it by adding a provider to `providers.json`:

```json
[
  {
    "id": "github",
    "strategy": "github",
    "name": "GitHub",
    "template": "https://github.com/{username}",
    "options": {
      "clientID": "abcdef1234567890",
      "clientSecret": "abcdef1234567890abcdef1234567890"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg",
    "url": "https://github.com"
  }
]
```

Each object in the list of providers can have the following properties:

- `id` (required) - Unique ID for the provider.
- `strategy` (required) - Name of the Passport strategy used by the provider.
- `name` (required) - Display name of the provider.
- `template` (optional) - A template string to generate a URI (the placeholder `{field}` can be any field provided in the `providerProfile` object, usually `{id}` or `{username}`).
- `credentialsNecessary` (optional) - Set to `true` if username and password credentials are necessary for this provider. Instead of a redirect (for OAuth), login-server will show a login form that will send the credentials to a POST endpoint.
- `options` (mostly required) - A options object for the strategy, often containing client credentials for the authentication endpoint.
- `image` (optional) - An image associated with the provider. Will be shown on the login page and in the list of connected identities. You can provide static images in the folder `static/`. The value for the property would then be `static/myimage.svg`. If the filename matches the `id` of the provider, the image will be automatically associated.
- `url` (optional) - A URL for the provider; will be linked on its image/icon under `/account`. There are default URLs for the strategies `github`, `orcid`, `mediawiki`, and `stackexchange`.

The following is an example `providers.json` that shows how to configure each of the existing providers:

```json
[
  {
    "id": "github",
    "strategy": "github",
    "name": "GitHub",
    "template": "https://github.com/{username}",
    "options": {
      "clientID": "abcdef1234567890",
      "clientSecret": "abcdef1234567890abcdef1234567890"
    }
  },
  {
    "id": "orcid",
    "strategy": "orcid",
    "name": "ORCID",
    "template": "https://orcid.org/{id}",
    "options": {
      "clientID": "APP-abcdef1234567890",
      "clientSecret": "abcdef1-23456-7890ab-cdef12-34567890"
    }
  },
  {
    "id": "mediawiki",
    "strategy": "mediawiki",
    "name": "Mediawiki",
    "template": "https://www.mediawiki.org/wiki/User:{username}",
    "options": {
      "consumerKey": "abcdef1234567890",
      "consumerSecret": "abcdef1234567890abcdef1234567890"
    }
  },
  {
    "id": "stackexchange",
    "strategy": "stackexchange",
    "name": "Stack Exchange",
    "template": "https://stackexchange.com/users/{id}",
    "options": {
      "clientID": "12345",
      "clientSecret": "abcdef1234567890((",
      "stackAppsKey": "1234567890abcdefg(("
    }
  },
  {
    "id": "my-ldap",
    "strategy": "ldapauth",
    "name": "My LDAP",
    "credentialsNecessary": true,
    "options": {
      "server": {
        "url": "ldap://ldap.example.com",
        "bindDN": "uid=admin,dc=example,dc=com",
        "bindCredentials": "abcdef1234567890",
        "searchBase": "dc=example,dc=com",
        "searchFilter": "(uid={{username}})"
      }
    }
  },
  {
    "id": "easydb",
    "name": "easydb test provider",
    "strategy": "easydb",
    "credentialsNecessary": true,
    "options": {
      "url": "https://easydb5-test.example.com/api/v1/"
    }
  },
  {
    "id": "some-script",
    "strategy": "script",
    "name": "Some Script",
    "credentialsNecessary": true,
    "template": "https://example.org/some-script/{id}",
    "options": {
      "script": "./bin/example-script"
    }
  }
]
```

To configure local providers, please use the provided script under `bin/manage-local.js`. It will allow you to create/delete local providers, and create/delete users for local providers.

You can adjust the path to the `providers.json` file with `PROVIDERS_PATH` in `.env`.

**Notes about using the MediaWiki provider:**
- If your consumer is limited to a specific instance (e.g. Wikidata only), you need to provide the baseURL for that instance in the options, for example: `"baseURL": "https://www.wikidata.org/"`.
- There seems to be a [bug](https://phabricator.wikimedia.org/T145828) either in Mediawiki or in passport-mediawiki-oauth that causes custom callback URLs to not work. This means that you need to provide the exact callback URL when registering your consumer (e.g. `https://coli-conc.gbv.de/login/login/wikidata/return` for our login-server instance).
- See also: https://www.mediawiki.org/wiki/OAuth/For_Developers

**Notes about using the Script provider:**
- The Script provider is currently implemented inside Login Server (see [`lib/script-strategy.js`](https://github.com/gbv/login-server/blob/master/lib/script-strategy.js)).
- The script's path (provided in `options.script`) can either be relative to Login Server's root folder, or an absolute path (recommended for Docker).
- An example for a very basic Bash script can be found in [`bin/example-script`](https://github.com/gbv/login-server/blob/master/bin/example-script).
- The script needs to be executable (`chmod +x`).
- The script needs to return valid JSON with the `id` value being set when authentication was successful. Optionally, `name` can be provided and will be used as the display name.
- Whatever language or environment the script is using needs to be available on the host that is running Login Server. When run inside a Docker container, only Bash and Node.js v20 are available. To use a different language, you need to extend Login Server's Docker image and install the required dependencies yourself.

## JWTs
login-server offers JSON Web Tokens that can be used to authenticate against other services (like [jskos-server](https://github.com/gbv/jskos-server)). [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) is used for signing the tokens.

By default, a new RSA keypair is generated when the application is first started (2048 bits, using [node-rsa](https://github.com/rzcoder/node-rsa)). This generated keypair will by default be available in `./private.key` and `./public.key`. You can give the `./public.key` file to any other service that needs to verify the tokens. Alternatively, the currently used public key is offered at the [/about endpoint](#get-about).

You can also provide a custom path for the key files by setting `JWT_PRIVATE_KEY_PATH` and `JWT_PUBLIC_KEY_PATH` in `.env`. If one or both of the keys can't be found, the keys will be generated. By default, the `RS256` algorithm is used, but any other public key algorithm can be used by setting `JWT_ALGORITHM`.

By default, each token is valid for 120 seconds. You can adjust this by setting `JWT_EXPIRES_IN` in `.env`.

Tokens get be received either through the [/token endpoint](#get-token) or by using the [WebSocket](#websocket) request of type `token`. Additionally, a token is sent via the WebSocket after the user is logged in and then regularly before the last token expires.

Example how to verify a token:

```javascript
import jwt from "jsonwebtoken"

// token, e.g. from user request
let token = "..."

// get public key from file or endpoint
let publicKey = "..."

jwt.verify(token, publicKey, (error, decoded) => {
  if (error) {
    // handle error
    // ...
  } else {
    let { user, iat, exp } = decoded
    // user is the user object
    // iat is the issued timestamp
    // exp is the expiration timestamp
    // ...
  }
})
```

Alternatively, you can use [passport-jwt](http://www.passportjs.org/packages/passport-jwt/) (example will follow).

[`/account`]: #get-account
[`/login`]: #get-login
[`/login/:provider/return`]: #get-loginproviderreturn
[`/login/:provider`]: #get-loginprovider

## Web interface

### GET /
Shows a landing page with general information about the login server.

### GET /account
Shows a site to manage one's user account (if already authenticated) or redirects to [`/login`] (if not authenticated).

### GET /sessions
Shows a site to manage the user's sessions (if authenticated) or redirects to [`/login`] (if not authenticated).

### GET /login
Shows a site to login (if not authenticated) or directs to [`/account`] (if authenticated).

If the query parameter `redirect_uri` is given, the site will redirect to the specified URI after a successful login. (If the parameter is given, but empty, it will use the referrer as a URI.)

### GET /login/:provider
Shows a login page for a provider. For OAuth providers, this page will redirect to the provider's page to connect your identity, which then redirects to [`/login/:provider/return`]. For providers using credentials, this will show a login form.

This page also handles `redirect_uri` (see [`/login`] above).

### POST /login/:provider
POST endpoint for providers using credentials. If successful, it will redirect to [`/account`], otherwise it will redirect back to [`/login/:provider`].

### GET /disconnect/:provider
Disconnects a provider from the user and redirects to [`/account`].

### GET /logout
Logs the user out of their account. Note that the session will remain because it is used for the WebSockets. This enables the application to send events to active WebSockets for the current session, even if the user has logged out.

### GET /delete
Shows a site to delete one's user account.

### POST /delete
Commits user account deletion and redirects to [`/login`].

## OAuth endpoint

The server provides an OAuth redirection endpoint (redirection URI) for each OAuth [provider](#providers).

### GET /login/:provider/return
Callback endpoint for OAuth requests. Will save the connected identity to the user (or create a new user if necessary) and redirect to [`/account`].

## HTTP API

Before directly programming against HTTP API and [WebSocket API](#websocket) have a look at the [login-client](https://github.com/gbv/login-client) JavaScript browser library. It can be seen in action [here](https://coli-conc.gbv.de/login/api) ([source for that site](https://github.com/gbv/login-server/blob/master/views/api.ejs)).

### GET /about
Returns an object with keys `title` (title of the login-server instance), `env` (environment, like `development` or `production`), `publicKey` (usually a RSA public key), and `algorithm` (the [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) algorithm used). The corresponding private key to the given public key is used when signing JWTs.

### GET /providers
Returns a list of available providers (stripped off sensitive information).

### GET /currentUser
Returns the currently logged in user. Returns an 404 error when no user is logged in.

### GET /users/:id
Returns a specific user. Currently restricted to one's own user ID.

### PATCH /users/:id
Adjusts a specific user. Can only be used if the same user is currently logged in. Allowed properties to change: `name` (everything else will be ignored).

### DELETE /sessions
Removes all sessions for the current user, except the current session.

### DELETE /sessions/:id
Removes the session with sessionID `:id` (needs to be a session for the current user).

### GET /token
Returns a JSON Web Token in the format:

```json
{
  "token": "<JWT>",
  "expiresIn": 120
}
```

See also: [JWTs](#jwts).

The token itself will contain a `user` property (which either contains information about the currently logged in user, or is null if the user is not logged in) and a `sessionID` property which is needed to authenticate within a [WebSocket](#websocket) connection.

## WebSocket
The WebSocket API at base URL `/` sends events about the current user or session. Events are sent as JSON-encoded strings that look like this:

```json
{
  "type": "event name (see below)",
  "date": "date (as ISOString)",
  "data": {
    "user": {
      "uri": "URI of user",
      "name": "name of user",
      "identities": {
        "xzy": {
          "id": "ID of user for provider xzy",
          "uri": "URI or profile URL of user for provider xzy",
          "name": "display name of user for provider xzy (if available)",
          "username": "username of user for provider xzy (if available)"
        }
      }
    }
  }
}
```

### Event types

- `open` - sent after WebSocket connection was established, use this instead of `ws.onopen`!
- `loggedIn` - sent when the user has logged in (will be sent immediately after establishing the WebSocket if the user is already logged in)
- `loggedOut` - sent when the user has logged out (will be sent immediately after establishing the WebSocket if the user is not logged in)
- `updated` - sent when the user was updated (e.g. added a new identity, etc.)
- `providers` - sent after WebSocket connection was established (consists of a property `data.providers` with a list of available providers)
- `about` - sent after WebSocket connection was established (property `data` will have the same format as in [GET /about](#get-about))
- `token` - sent when the user has logged in and then in intervals before the previous token expires (property `data` will have the same format as in [GET /token](#get-token))
- `authenticated` - sent as a success reply when requesting authentication (see below)
- `pong` - sent as an answer to a request of type `ping` (can be used to determine whether the WebSocket has become stale)
- `sessionAboutToExpire` - sent when the currently associated session is about to expire
- `error` - sent as answer to a malformed message via the WebSocket (consists of a property `data.message` with an error message)

You can also send requests to the WebSocket. These also have to be JSON-encoded strings in the following form:

```json
{
  "type": "name of request"
}
```

### Authenticate request
This is a special request that uses a JWT acquired from [GET /token](#get-token) to associate the current WebSocket with a particular session (sent request object needs property `token`)

The `authenticate` request is sometimes necessary when the WebSocket is used from a different domain than login-server. In that case, a token needs to be requested via the API (e.g. using fetch with option `credentials: "include"` or axios with option `withCredentials: true`) and be sent via the WebSocket. The token includes the encrypted sessionID that will then be associated with the WebSocket connection. Here is an example on how a workflow from a web application could look like: <https://coli-conc.gbv.de/login/api>

### Example Usage
The following is a simple example on how to connect to the WebSocket.

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


## Maintainers

- [@stefandesu](https://github.com/stefandesu)
- [@nichtich](https://github.com/nichtich)

## Contribute
PRs accepted.

- Please use the `dev` branch as a basis. Changes from `dev` will be merged into `master` only for new releases.
- Please run the tests before committing.
- Please do not skip the pre-commit hook when committing your changes.
- If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

### Publish
**For maintainers only**

Never work on the master branch directly. Always make changes on `dev` and then run the release script:

```bash
npm run release:patch # or minor or major
```

## Related Works
- https://github.com/netlify/gotrue

## License
MIT © 2019 Verbundzentrale des GBV (VZG)
