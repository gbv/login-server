/**
 * Utility functions
 */

const _ = require("lodash")
const config = require("../config")
const jwt = require("jsonwebtoken")

// Imports for getUserFromSession
const mongoStore = require("../utils/mongoStore")
const User = require("../models/user")

const db = require("./db")

/**
 * Returns a random v4 UUID.
 *
 * from: https://gist.github.com/jed/982883
 *
 * @returns {string}
 */
function uuid(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,uuid)}

/**
 * Prepares list of providers by removing sensitive properties.
 *
 * @returns {object[]}
 */
function prepareProviders() {
  return config.providers.map(provider => _.omit(provider, ["template", "auth", "callbackURL", "options"]))
}

/**
 * Prepares information about the server.
 *
 * @returns {object}
 */
function prepareAbout() {
  return {
    title: config.title,
    env: config.env,
    version: config.package.version,
    baseUrl: config.baseUrl,
    urls: config.urls,
    allowedDomains: config.allowedOrigins,
    publicKey: config.publicKey.toString("utf8"),
    algorithm: config.jwtOptions.algorithm,
    cookieMaxDays: config.cookieMaxDays,
    ok: db.readyState === 1 ? 1 : 0,
  }
}

/**
 * Prepares flash messages for template.
 *
 * @param {Request} req
 *
 * @returns {object}
 */
function flashMessages(req) {
  // try-catch is necessary because `req.flash` needs a session store and fails if the database is not connected.
  try {
    return {
      success: req.flash("success"),
      info: req.flash("info"),
      warning: req.flash("warning"),
      danger: req.flash("error"),
    }
  } catch(error) {
    return {}
  }
}

/**
 * Returns a Promise for a JSON Web Token.
 *
 * @param {object} user
 * @param {string} sessionID
 * @returns {Promise<object>} A Promise with an object that contains a JWT in the `token` property if fulfilled, or an error if rejected.
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
 * @param {string} sessionID
 * @returns {Promise<object>} A Promise with an user object if fulfilled, or an error if rejected.
 */
function getUserFromSession(sessionID) {
  return new Promise((resolve, reject) => {
    // Get session from sessionID
    mongoStore.get(sessionID, (localError, session) => {
      if (localError || !session.passport.user) {
        // Relay error to Promise
        reject(localError || new Error("No passport user."))
      } else {
        // Get user from session
        User.findById(session.passport.user).then(user => {
          resolve(user)
        }).catch(error => {
          // Relay error to Promise
          reject(error)
        })
      }
    })
  })
}

/**
 * Saves the referrer in the current session if necessary.
 * See https://github.com/gbv/login-server/issues/70.
 *
 * @param {Request} req
 */
function saveReferrerInSession(req) {
  const referrer = req.get("Referrer")
  if (!req.user && req.session && referrer && !referrer.includes(config.baseUrl)) {
    req.session.referrer = referrer
  }
}

module.exports = {
  uuid,
  prepareProviders,
  prepareAbout,
  flashMessages,
  getToken,
  getUserFromSession,
  saveReferrerInSession,
}
