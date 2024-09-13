/**
 * Script Stategy.
 */

import { Strategy } from "../lib/script-strategy.js"

export default (options, provider, callback) => new Strategy(options, (req, token, tokenSecret, profile, done) => {
  callback(req, token, tokenSecret, {
    id: profile.id || profile.username,
    name: profile.name,
    username: profile.username,
    uri: profile.uri,
    provider: provider.id,
  }, done)
})
