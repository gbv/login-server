/**
 * Strategy routes.
 */

const config = require("../config")
const utils = require("../utils")
const strategies = require("../strategies").strategies

const _ = require("lodash")
const passport = require("passport")
const apiLimiter = require("express-rate-limit")(config.rateLimitOptions)


module.exports = app => {

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
