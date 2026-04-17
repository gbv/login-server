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

  return new Strategy(
    options,
    async (req, issuer, sub, profile, accessToken, refreshToken, params, done) => {
      // VerifyFunction parameters: Request, OpenID issuer URL, subject (user ID), user profile, access token, refresh token, additional params, callback function
      callback(req, accessToken, refreshToken, {
        id: profile?.id || sub,
        name: profile?.displayName || profile?.name || profile?.username || params?.name || `${sub}`,
        username: profile?.username || profile?.preferred_username || profile?.email || params?.preferred_username || params?.email || sub,
        email: profile?.emails?.[0]?.value || profile?.email || params?.email || undefined,
        uri: profile?.profileUrl || profile?._json?.profile ||  provider.id || undefined,
        provider: provider.id,
      }, done)
    },
  )
}
