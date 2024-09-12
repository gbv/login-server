/**
 * OAuth2 Stategy adjusted for Stack Exchange.
 */

import { Strategy } from "passport-oauth2"
import axios from "axios"
import config from "../config.js"

export default (options, provider, callback) => {
  const profileURL = "https://api.stackexchange.com/2.3/me"
  options.authorizationURL = "https://stackexchange.com/oauth"
  options.tokenURL = "https://stackexchange.com/oauth/access_token"
  // Compatibility with old strategy that used passport-stack-exchange
  if (options.stackAppsKey && !options.sessionKey) {
    options.sessionKey = options.stackAppsKey
  }
  // Check if all required props are available
  for (const prop of ["clientID", "clientSecret", "sessionKey"]) {
    if (!options[prop]) {
      const message = `Provider ${provider.id}: ${prop} is required. Will skip initialization.`
      config.warn(message)
      new Error(message)
    }
  }
  return new Strategy(options, async (req, accessToken, refreshToken, profile, done) => {
    // Load profile via API
    const response = await axios.get(profileURL, {
      params: {
        key: options.sessionKey,
        site: options.site || "stackoverflow",
        access_token: accessToken,
      },
    })
    profile = response?.data?.items?.[0]
    if (!profile) {
      // Fallback to /me/associated.
      // This is necessary if the user has an account, but on a different Stack site than the one configured.
      // Using the fallback, display_name cannot be obtained.
      const response = await axios.get(profileURL + "/associated", {
        params: {
          key: options.sessionKey,
          access_token: accessToken,
        },
      })
      profile = response?.data?.items?.[0]
    }
    callback(req, accessToken, refreshToken, {
      id: profile?.account_id,
      name: profile?.display_name,
      provider: provider.id,
    }, done)
  })
}
