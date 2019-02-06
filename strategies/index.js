/**
 * Imports and configures all available stategies.
 */

const _ = require("lodash")
const config = require("../config")

module.exports = callback => {
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
