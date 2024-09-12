/**
 * Stategy for local passwords.
 *
 * Use bin/manage-local.js to manage local providers and users.
 */

import { Strategy } from "passport-local"
import bcrypt from "bcryptjs"

export default (options, provider, callback) => new Strategy(options, (req, username, password, done) => {
  let profile = provider.options.users.find(user => username == user.username && bcrypt.compareSync(password, user.password))
  if (profile) {
    callback(req, null, null, {
      id: profile.id || profile.username,
      name: profile.displayName,
      username: profile.username,
      uri: profile.uri,
      provider: provider.id,
    }, done)
  } else {
    done(null, false)
  }
})
