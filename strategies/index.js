/**
 * Imports and configures all available stategies.
 */

import _ from "lodash"
import config from "../config.js"
import * as utils from "../utils/index.js"
import * as events from "../lib/events.js"
import User from "../models/user.js"

export const verify = (req, token, tokenSecret, profile, done) => {
  let user = req.user
  const sessionID = req.sessionID
  let provider = config.providers.find(provider => provider.id === profile.provider)
  // Omit username from profile if it is empty
  if (_.isEmpty(profile.username)) {
    delete profile.username
  }
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
        // Determine name
        let name = profile.name
        if (!name) {
          // Fallback to username/id@provider
          name = `${profile.username || profile.id}@${profile.provider}`
        }
        user = new User({
          _id: id,
          uri: `${config.baseUrl}users/${id}`,
          name,
          identities: {
            [profile.provider]: _.omit(profile, ["provider"]),
          },
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
          return User.findByIdAndDelete(existingUser.id).then(() => user.save()).then(user => {
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

export const strategyForProvider = {}

for (const provider of config.providers) {
  strategyForProvider[provider.strategy] = (await import(`./${provider.strategy}.js`)).default
}

const setup = callback => {
  let result = {}

  for (let provider of config.providers) {
    let options = Object.assign({
      passReqToCallback: true,
      callbackURL: provider.callbackURL,
      logger: {
        log: config.log,
        warn: config.warn,
        error: config.error,
      },
    }, provider.options)
    try {
      result[provider.id] = strategyForProvider[provider.strategy](options, provider, (req, token, tokenSecret, profile, done) => {
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
      config.warn(`Error configuring provider ${provider.id}.`)
    }
  }

  return result
}

export const strategies = setup(verify)
