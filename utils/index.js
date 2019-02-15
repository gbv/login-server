/**
 * Utility functions
 */

const _ = require("lodash")
const config = require("../config")
const jwt = require("jsonwebtoken")

// Imports for getUserFromSession
const mongoStore = require("../utils/mongoStore")
const User = require("../models/user")

/**
 * Returns a random v4 UUID.
 *
 * from: https://gist.github.com/jed/982883
 */
function uuid(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,uuid)}

/**
 * Prepares list of providers by removing sensitive properties.
 */
function prepareProviders() {
  return config.providers.map(provider => _.omit(provider, ["template", "auth", "callbackURL", "options"]))
}

function flashMessages(req) {
  return {
    success: req.flash("success"),
    info: req.flash("info"),
    warning: req.flash("warning"),
    danger: req.flash("error")
  }
}

/**
 * Returns a Promise for a JSON Web Token.
 *
 * @param {*} user
 * @param {*} sessionID
 */
function getToken(user, sessionID) {
  let data = {}
  // Don't include `identities` in JWT payload.
  data.user = user ? _.omit(user, ["identities"]) : null

  let sessionPromise = Promise.resolve(null)
  if (sessionID) {
    // Include encrypted sessionID for session identification through the token, only if there exists a session with this token
    sessionPromise = mongoStore.get(sessionID).then(session => session ? sessionID : null).catch(() => null)
  }
  return sessionPromise.then(sessionID => {
    if (sessionID) {
      data.sessionID = config.key.encrypt(sessionID, "base64")
    }
    let token = jwt.sign(data, config.privateKey, config.jwtOptions)
    return {
      token,
      expiresIn: config.jwtOptions.expiresIn,
    }
  })
}

/**
 * Returns a Promise with a user for a sessionID.
 *
 * @param {*} sessionID
 */
function getUserFromSession(sessionID) {
  return new Promise((resolve, reject) => {
    // Get session from sessionID
    mongoStore.get(sessionID, (localError, session) => {
      if (localError || !session.passport.user) {
        reject()
      } else {
        // Get user from session
        User.findById(session.passport.user).then(user => {
          resolve(user)
        }).catch(() => {
          reject()
        })
      }
    })
  })
}

module.exports = {
  uuid,
  prepareProviders,
  flashMessages,
  getToken,
  getUserFromSession,
}
