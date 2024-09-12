/**
 * OAuth Stategy for Mediawiki.
 */

import { OAuthStrategy as Strategy } from "passport-mediawiki-oauth"

export default (options, provider, callback) => new Strategy(options, (req, token, tokenSecret, profile, done) => {
  callback(req, token, tokenSecret, {
    id: profile.id,
    name: profile.displayName,
    username: profile._json.username,
    oauth: {
      token: token,
      token_secret: tokenSecret,
    },
    provider: provider.id,
  }, done)
})
