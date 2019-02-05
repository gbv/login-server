/**
 * OAuth Stategy for GitHub.
 */

const Strategy = require("passport-github").Strategy

module.exports = (options, provider, callback) => new Strategy(options, (req, token, tokenSecret, profile, done) => {
  callback(req, token, tokenSecret, {
    id: profile.id,
    name: profile.displayName,
    username: profile.username,
    provider: provider.id
  }, done)
})
