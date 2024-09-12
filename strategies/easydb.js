/**
 * easydb Stategy.
 */

import Strategy from "passport-easydb"

export default (options, provider, callback) => new Strategy(options, (req, accessToken, refreshToken, profile, done) => {
  callback(req, null, null, {
    id: profile.id,
    name: profile._json.user._generated_displayname,
    username: profile.username,
    token: accessToken,
    provider: provider.id,
  }, done)
})
