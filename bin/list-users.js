#!/usr/bin/env node

/**
 * A small tool to query user data from the database.
 */

import meow from "meow"
const cli = meow(`
Usage
  $ ./bin/list-users.js [IDs or URIs] [options]

  This tool returns the JSON data for users in the MongoDB.
  If no IDs or URIs are given, it will return data for all users.

  Outputs one line per user (newline delimited JSON).

  Note that URIs need to be quoted if they contain certain characters (like a question mark or a space).

Options
  GNU long option         Option      Meaning
  --with-provider         -p          Only applicable when no user ID is given;
                                      returns users that have a certain provider associated with them;
                                      can be given multiple times

Examples
  $ ./bin/list-users.js c0c1914a-f9d6-4b92-a624-bf44118b6619
  $ ./bin/list-users.js https://github.com/stefandesu
  $ ./bin/list-users.js -p github
`, {
  flags: {
    withProvider: {
      type: "string",
      alias: "p",
      isMultiple: true,
    },
    help: {
      type: "boolean",
      alias: "h",
      default: false,
    },
  },
  allowUnknownFlags: false,
})

if (cli.input.length && cli.flags.withProvider.length) {
  console.error("--with-provider/-p can only be used if no user ID/URI is specified.")
  cli.showHelp()
}

process.env.VERBOSITY = "error"
import config from "../config.js"
import * as utils from "../utils/index.js"
import * as db from "../utils/db.js"
import User from "../models/user.js"

// Copied from jskos-tools
const isValidUri = (uri) => {
  // from: http://jmrware.com/articles/2009/uri_regexp/URI_regex.html
  const re_js_rfc3986_URI = /^[A-Za-z][A-Za-z0-9+\-.]*:(?:\/\/(?:(?:[A-Za-z0-9\-._~!$&'()*+,;=:]|%[0-9A-Fa-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9A-Fa-f]{1,4}:){6}|::(?:[0-9A-Fa-f]{1,4}:){5}|(?:[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,1}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){3}|(?:(?:[0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){2}|(?:(?:[0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}:|(?:(?:[0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})?::)(?:[0-9A-Fa-f]{1,4}:[0-9A-Fa-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})?::)|[Vv][0-9A-Fa-f]+\.[A-Za-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[A-Za-z0-9\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*)(?::[0-9]*)?(?:\/(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*|\/(?:(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:\/(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)?|(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:\/(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*|)(?:\?(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?(?:#(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?$/
  return uri.match(re_js_rfc3986_URI) !== null
}

;(async () => {
  await db.connect(true)

  try {
    const query = { $or: [] }
    if (cli.input.length) {
      query.$or = cli.input.map(id => {
        if (isValidUri(id)) {
          return { $or: config.providers.map(provider => ({ [`identities.${provider.id}.uri`]: id })).concat({ uri: id }, { merged: id }) }
        } else {
          return { _id: id }
        }
      })
    } else {
      for (let provider of cli.flags.withProvider) {
        query.$or.push({ [`identities.${provider}`]: { $exists: true } })
      }
    }
    const users = await User.find(query).lean()
    // Add usage data
    for (const user of users) {
      await utils.addUsageToUserObject(user)
    }
    users.forEach(user => console.log(JSON.stringify(user)))
  } catch (error) {
    console.error(error)
  }

  await db.disconnect()
})()
