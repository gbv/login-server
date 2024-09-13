/**
 * Strategy routes.
 */

import config from "../config.js"
import * as utils from "../utils/index.js"
import { strategies } from "../strategies/index.js"

import _ from "lodash"
import passport from "passport"
import expressRateLimit from "express-rate-limit"
const apiLimiter = expressRateLimit(config.rateLimitOptions)


export default app => {

  _.forEach(strategies, (strategy, providerId) => {

    let provider = utils.prepareProviders().find(provider => provider.id === providerId)
    if (!provider) {
      return
    }

    let skip = (req, res, next) => {
      if (req.user && req.user.identities && req.user.identities[providerId]) {
      // User has already connected this identity
        req.flash("info", `${provider.name} is already connected.`)
        res.redirect("/account")
      } else {
        next()
      }
    }

    let authenticateOptions = {
      successRedirect: "/account",
      failureRedirect: `/login/${providerId}`,
      failureFlash: "Could not verify credentials.",
      keepSessionInfo: true,
    }

    if (provider.credentialsNecessary) {
    // Add a GET and POST route

      app.get(`/login/${providerId}`, skip, (req, res) => {
        utils.saveReferrerInSession(req)
        res.render("loginCredentials", { provider })
      })

      app.post(`/login/${providerId}`,
        apiLimiter,
        passport.authenticate(providerId, authenticateOptions))

    } else {
    // Add GET routes for login redirection and return

      // Shows a message and redirects to auth (next route)
      // Explanation: We need this so that the client side JavaScript can parse the redirect_uri parameter if necessary.
      app.get(`/login/${providerId}`, (req, res) => {
        utils.saveReferrerInSession(req)
        res.render("login-auth", { provider, redirect: { delay: 2, url: config.baseUrl + req.path.slice(1) + "/auth" } })
      })

      // Authenticates with a certain provider
      app.get(`/login/${providerId}/auth`, skip,
        passport.authenticate(providerId))

      // Callback route for provider
      app.get(`/login/${providerId}/return`,
        passport.authenticate(providerId, authenticateOptions))

    }
  })

}
