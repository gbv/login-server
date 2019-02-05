/**
 * Imports and configures all available stategies.
 */

const config = require("../config")

module.exports = callback => {
  let result = {}

  for (let provider of config.providers) {
    let options = Object.assign({
      passReqToCallback: true,
      callbackURL: `${config.baseUrl}/login/${provider.id}/return`,
    }, provider.auth)
    try {
      result[provider.id] = require(`./${provider.id}`)(options, provider, callback)
    } catch(error) {
      console.warn(`Error configuring provider ${provider.id}.`)
    }
  }

  return result
}
