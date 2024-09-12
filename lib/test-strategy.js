/**
 * Test strategy for testing (basically a simple version of passport-local)
 *
 * Requires a `users` array in options where each user has a `username` and a `password`.
 */

/**
 * Module dependencies.
 */
import passport from "passport-strategy"
import util from "node:util"

/**
 * `Strategy` constructor.
 *
 *
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */
export function Strategy({ users, passReqToCallback }, callback) {
  if (!users || !users.length) {
    throw new TypeError("Test strategy requires at least one user")
  }
  passport.Strategy.call(this)
  this.name = "test"
  this._passReqToCallback = passReqToCallback
  this._users = users
  this._cb = callback
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy)

/**
 * Authenticate using supplied user.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req) {
  let username = (req.body && req.body.username) || req.query.username
  let password = (req.body && req.body.password) || req.query.password
  if (!username || !password) {
    return this.fail({ message: "Missing credentials" }, 400)
  }
  let user = this._users.find(u => u.username == username && u.password == password)
  if (!user) {
    return this.fail({ message: "Wrong credentials" }, 400)
  }
  user = Object.assign({ password: undefined }, user)
  let args = this._passReqToCallback ? [req] : []
  args = args.concat([null, null, user, (error, user) => {
    this.success(user)
  }])
  this._cb(...args)
}
