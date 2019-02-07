/**
 * Utility functions
 */

const _ = require("lodash")
const config = require("../config")

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

module.exports = {
  uuid,
  prepareProviders,
  flashMessages,
}
