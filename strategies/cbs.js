/**
 * CBS Stategy.
 */

import Strategy from "../lib/cbs-strategy.js"

export default (options, provider, callback) => new Strategy(options, (req, accessToken, refreshToken, profile, done) => {
  callback(req, null, null, {
    id: profile.data.userKey,
    name: profile.data?.name,
    provider: provider.id,
  }, done)
})
