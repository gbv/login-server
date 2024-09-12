/**
 * LDAP Stategy.
 */

import Strategy from "passport-ldapauth"

export default (options, provider, callback) => new Strategy(options, (req, profile, done) => {
  callback(req, null, null, {
    id: profile.uid,
    name: profile.cn,
    username: profile.uid,
    provider: provider.id,
  }, done)
})
