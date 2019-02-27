/**
 * Imports and configures all available stategies.
 */

const _ = require("lodash")
const config = require("../config")
const utils = require("../utils")
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
        req.flash("success", "You have been logged in.")
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
          req.flash("success", "A new user account has been created!")
          done(null, user)
        }).catch(error => {
          done(error, null)
        })
      }
    }).catch(error => {
      done(error, null)
    })
  } else {
    // User is already logged in. Check if identity is already attached to a different account.
    User.findOne({ [`identities.${profile.provider}.id`]: profile.id }).then(existingUser => {
      if (!existingUser) {
        // Add identity to user profile
        // Note: This is a workaround to make Mongoose recognize the changes.
        let identities = Object.assign(user.identities, { [profile.provider]: _.omit(profile, ["provider"]) })
        user.set("identities", {})
        user.set("identities", identities)
        return user.save().then(user => {
          events.userUpdated(sessionID, user)
          req.flash("success", `${provider && provider.name} successfully connected.`)
          done(null, user)
        })
      } else {
        const intersection = _.intersection(_.keys(user.identities), _.keys(existingUser.identities))
        if (intersection.length == 0) {
          // No intersecting identities, can automatically merge user accounts.
          // Merge identities
          let identities = Object.assign(user.identities, existingUser.identities)
          user.set("identities", {})
          user.set("identities", identities)
          // Add previous URI to merged
          if (!user.merged) {
            user.merged = []
          }
          user.merged.push(existingUser.uri)
          return User.findByIdAndRemove(existingUser.id).then(() => user.save()).then(user => {
            events.userUpdated(sessionID, user)
            req.flash("success", `${provider && provider.name} successfully connected by merging existing account.`)
            done(null, user)
          })
        } else {
          // There is a conflict with identities.
          req.flash("error", `${provider && provider.name} is already connected to an existing account and a merge could not be performed automatically. To perform the merge, remove the following identities from either account: ${intersection.join(", ")}`)
          done(null, user)
        }
      }
    }).catch(error => {
      done(error, user)
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
