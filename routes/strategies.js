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
    let strategyName = provider.strategy

    let skip = (req, res, next) => {
      if (req.user && req.user.identities && req.user.identities[providerId]) {
      // User has already connected this account
        req.flash("info", `${provider.name} is already connected.`)
        res.redirect("/account")
      } else {
        next()
      }
    }

    let authenticateOptions = {
      successRedirect: "/account",
      failureRedirect: `/login/${providerId}`,
      failureFlash: "Could not verify credentials."
    }

    if (provider.credentialsNecessary) {
    // Add a GET and POST route

      app.get(`/login/${providerId}`, skip, (req, res) => {
        res.render("loginCredentials", {
          provider,
          user: req.user,
          messages: utils.flashMessages(req),
        })
      })

      app.post(`/login/${providerId}`,
        apiLimiter,
        passport.authenticate(strategyName, authenticateOptions))

    } else {
    // Add GET routes for login redirection and return

      app.get(`/login/${providerId}`, skip,
        passport.authenticate(strategyName))

      app.get(`/login/${providerId}/return`,
        passport.authenticate(strategyName, authenticateOptions))

    }
  })

}
