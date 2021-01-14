/**
 * Login route.
 */

const utils = require("../utils")

module.exports = app => {

  app.get("/login", (req, res) => {
    utils.saveReferrerInSession(req)
    if (req.user) {
      res.redirect("/account")
    } else {
      res.render("login")
    }
  })

}
