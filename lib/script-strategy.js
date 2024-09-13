/**
 * Script strategy that calls a local script to verify provided credentials.
 *
 * See: https://github.com/gbv/login-server/issues/117
 *
 * Requires a local path to the script.
 */

/**
 * Module dependencies.
 */
import passport from "passport-strategy"
import util from "node:util"

import { exec as cpexec } from "node:child_process"
/**
 * A wrapper around child_process' exec function for async/await.
 *
 * @param {*} command
 * @param {*} options
 */
async function exec(command, options) {
  return new Promise((resolve, reject) => {
    cpexec(command, options || {}, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        return reject(error)
      }
      resolve(stdout)
    })
  })
}

/**
 * `Strategy` constructor.
 *
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */
export function Strategy({ script, passReqToCallback }, callback) {
  if (!script) {
    throw new TypeError("Script strategy requires a script to run")
  }
  passport.Strategy.call(this)
  this.name = "script"
  this._passReqToCallback = passReqToCallback
  this._script = script
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
Strategy.prototype.authenticate = async function(req) {
  let username = (req.body && req.body.username) || req.query.username
  let password = (req.body && req.body.password) || req.query.password
  if (!username || !password) {
    return this.fail({ message: "Missing credentials" }, 400)
  }
  try {
    const result = JSON.parse(await exec(this._script, { env: { ...process.env, USERNAME: username, PASSWORD: password }}))
    if (!result?.id) {
      throw new Error(result.message || "Wrong credentials")
    }
    const user = result
    let args = this._passReqToCallback ? [req] : []
    args = args.concat([null, null, user, (error, user) => {
      this.success(user)
    }])
    this._cb(...args)
  } catch (error) {
    return this.fail({ message: error.message }, 400)
  }
}
