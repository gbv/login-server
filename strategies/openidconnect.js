/**
 * OpenID Connect Strategy
 */

import { Strategy } from "passport-openidconnect" // not ESM compatible
import config from "../config.js"
import * as utils from "../utils/index.js"

export default (options, provider, callback) => { // Factory function


  // for StrategyOptions:
  const required = ["issuer", "authorizationURL", "tokenURL", "callbackURL", "clientID", "clientSecret"]
  // const optional = ["acrValues", "agent", "claims", "customHeaders", "display", "idTokenHint", "loginHint", "maxAge", "nonce", "prompt", "proxy", "responseMode", "scope", "uiLocales", "passReqToCallback", "sessionKey", "store", "skipUserProfile"]
  // Validate required options
  for (const prop of required) {
    if (!options[prop]) {
      const message = `Provider ${provider.id}: missing required option "${prop}". Skipping initialization.`
      config.warn(message)
      throw new Error(message)
    }
  }

  // guarantee required options and set defaults
  options.scope = options.scope || ["openid", "profile", "email"]
  options.passReqToCallback = true
  if (!options.issuer.endsWith("/")) {
    options.issuer += "/"
  }

  return new Strategy(
    options,
    function(req, issuer, profile, context, idToken, accessToken, refreshToken, params, done) {
      const item = {
        id: profile?.id || profile?.sub || utils.uuid(),
        name: profile?.name?.givenName && profile?.name?.familyName && `${profile.name.givenName} ${profile.name.familyName}` || profile?.displayName,
        username: profile?.displayName || profile?.emails?.[0]?.value,
        provider: provider.id,
        email: profile?.emails?.[0]?.value || undefined,
        emails: profile?.emails || undefined,
        // token: accessToken || undefined,
        organization: profile?.schac_home_organization || undefined,
        sub: profile?.sub || undefined,
        iss: profile?.iss || undefined,
        affiliation: profile?.eduperson_scoped_affiliation ||undefined,
        assurance: profile?.eduperson_assurance || profile?.asr || undefined,
      }

      try {
        callback(req, accessToken, refreshToken, item, done)
      } catch (err) {
        console.error("=== Callback Error ===", err)
        done(err)
      }
    },
  )
}
