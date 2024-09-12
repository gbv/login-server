/**
 * OAuth Stategy for GitHub.
 */

import { Strategy } from "passport-github"

export default (options, provider, callback) => new Strategy(options, (req, token, tokenSecret, profile, done) => {
  callback(req, token, tokenSecret, {
    id: profile.id,
    name: profile.displayName,
    username: profile.username,
    provider: provider.id,
  }, done)
})
