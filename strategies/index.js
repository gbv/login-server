/**
 * Imports and configures all available stategies.
 */

const _ = require("lodash")
const config = require("../config")
const events = require("../lib/events")
const User = require("../models/user")

const verify = (req, token, tokenSecret, profile, done) => {
  let user = req.user
  const sessionID = req.sessionID
  let provider = config.providers.find(provider => provider.id === profile.provider)
  if (!user) {
    // User is not yet logged in. Either find existing user or create a new user.
    User.findOne({ [`identities.${profile.provider}.id`]: profile.id }).then(user => {
      if (user) {
        // Found existing user
        // Fire loggedIn event
        events.userLoggedIn(sessionID, user)
        req.flash("success", "You were logged in.")
        done(null, user)
      } else {
        // Create new user
        let id = utils.uuid()
        user = new User({
          _id: id,
          uri: `${config.baseUrl}/users/${id}`,
          name: profile.name,
          identities: {
            [profile.provider]: _.omit(profile, ["provider"])
          }
        })
        user.save().then(user => {
          // Fire loggedIn event
          events.userLoggedIn(sessionID, user)
          req.flash("success", "A new user account was successfully created!")
          done(null, user)
        }).catch(error => {
          done(error, null)
        })
      }
    }).catch(error => {
      done(error, null)
    })
  } else {
    // User is already logged in. Add new profile to identities.
    // Note: This is a workaround to make Mongoose recognize the changes.
    let identities = Object.assign(user.identities, { [profile.provider]: _.omit(profile, ["provider"]) })
    user.set("identities", {})
    user.set("identities", identities)
    user.save().then(user => {
      events.userUpdated(sessionID, user)
      req.flash("success", `${provider && provider.name} successfully connected.`)
      done(null, user)
    }).catch(error => {
      done(error, null)
    })
  }
}

const setup = callback => {
  let result = {}

  for (let provider of config.providers) {
    let options = Object.assign({
      passReqToCallback: true,
      callbackURL: provider.callbackURL,
    }, provider.options)
    try {
      result[provider.id] = require(`./${provider.strategy}`)(options, provider, (req, token, tokenSecret, profile, done) => {
        // Add URI to profile
        let uri = provider.template
        if (uri) {
          _.forOwn(profile, (value, key) => {
            uri = uri.replace(`{${key}}`, value)
          })
          profile.uri = uri
        }
        callback(req, token, tokenSecret, profile, done)
      })
    } catch(error) {
      console.warn(`Error configuring provider ${provider.id}.`)
    }
  }

  return result
}

// Export verify function for testing purposes
module.exports = {
  verify,
  strategies: setup(verify),
}
