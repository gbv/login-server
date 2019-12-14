/**
 * easydb Stategy.
 */

const Strategy = require("passport-easydb")

module.exports = (options, provider, callback) => new Strategy(options, (req, accessToken, refreshToken, profile, done) => {
  callback(req, null, null, {
    id: profile.id,
    name: profile.displayName,
    username: profile.username,
    token: accessToken,
    provider: provider.id
  }, done)
})
