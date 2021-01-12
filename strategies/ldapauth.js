/**
 * LDAP Stategy.
 */

const Strategy = require("passport-ldapauth")

module.exports = (options, provider, callback) => new Strategy(options, (req, profile, done) => {
  callback(req, null, null, {
    id: profile.uid,
    name: profile.cn,
    username: profile.uid,
    provider: provider.id,
  }, done)
})
