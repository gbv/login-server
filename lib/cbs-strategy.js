// Load modules.
import passport from "passport-strategy"
import util from "node:util"
import axios from "axios"

/**
 * `Strategy` constructor.
 *
 * The CBS authentication strategy authenticates using an experimental authentication endpoint.
 *
 * Applications must supply a `verify` callback which accepts an `accessToken`,
 * `refreshToken` (always null) and service-specific `profile`, and then calls
 * the `cb` (or `done`) callback supplying a `user`, which should be set to `false`
 * if the credentials are not valid. If an exception occured, `err` should be set.
 *
 * Options:
 *   - `url`        the easydb API base URL including trailing slash
 *
 * Examples:
 *
 *     passport.use(new Strategy({
 *         url: "https://cbs.example.com/ext/api/colirich/",
 *         apiKey: "abcdef",
 *       },
 *       function(accessToken, refreshToken, profile, cb) {
 *         User.findOrCreate(..., function (err, user) {
 *           cb(err, user);
 *         });
 *       }
 *     ));
 *
 * @constructor
 * @param {object} options
 * @param {function} verify
 * @access public
 */
function Strategy(options, verify) {
  options = options || {}
  passport.Strategy.call(this)
  this.name = "cbs"
  this._verify = verify
  this._url = options.url
  this._apiKey = options.apiKey
  this._passReqToCallback = options.passReqToCallback
  // Add logging via a "logger" object with logging methods
  this._logger = options.logger || {
    log: () => {},
    warn: () => {},
    error: () => {},
  }
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy)

/**
 * Authenticate using supplied username and password.
 *
 * @param {object} req
 * @param {object} options
 * @api protected
 */
Strategy.prototype.authenticate = async function(req, options) {
  options = options || {}
  const url = options.url || this._url
  if (!url) {
    const message = "CBS error: Missing API URL"
    this._logger.error(message)
    return this.fail({ message }, 400)
  }
  const apiKey = options.apiKey || this._apiKey
  if (!apiKey) {
    const message = "CBS error: Missing API key"
    this._logger.error(message)
    return this.fail({ message }, 400)
  }

  let username = (req.body && req.body.username) || req.query.username
  let password = (req.body && req.body.password) || req.query.password
  if (!username || !password) {
    return this.fail({ message: "Missing credentials" }, 400)
  }

  // Authenticate with key and credentials
  let profile
  try {
    const result = await axios({
      method: "post",
      url: `${url}users/${username}/info`,
      data: {
        password,
      },
      headers: { Authorization: `apikey ${apiKey}` },
    })
    // Axios throws on status 401, so this should not be reached, but we're making sure it is handled correctly just in case.
    if (!result.data?.data?.userKey) {
      const errorData = result.data?.errors?.[0]
      const error = new Error(errorData?.title)
      error.status = parseInt(errorData?.status) || 400
      throw error
    }
    profile = result.data
  } catch(error) {
    if (error.status === 401) {
      const message = error.response?.data?.errors?.[0]?.title || "Wrong credentials"
      return this.fail({ message }, 401)
    }
    const message = `CBS strategy: Unknown error - ${error.message}`
    this._logger.error(message)
    return this.fail({ message }, 400)
  }
  profile._json = profile
  let args = this._passReqToCallback ? [req] : []
  args = args.concat([null, null, profile, (error, profile) => {
    this.success(profile)
  }])
  this._verify(...args)
}

// Expose constructor.
export default Strategy
