/**
 * OpenID Connect Strategy
 */

import { Strategy } from "passport-openidconnect" // not ESM compatible
import config from "../config.js"

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
        id: profile?.id,
        name: profile?.displayName || profile?.username || profile?.name?.givenName + " " + profile?.name?.familyName,
        username: profile.displayName || profile?.preferred_username || profile?.emails?.[0]?.value,
        email: profile?.emails?.[0]?.value || profile?.email || params?.email || undefined,
        uri: profile?.profileUrl || profile?._json?.profile ||  issuer,
        provider: provider.id,
      }
      // console.log("=== Built Item ===", item)
      
      try {
        callback(req, accessToken, refreshToken, item, done)
      } catch (err) {
        console.error("=== Callback Error ===", err)
        done(err)
      }
    },
  )
}
