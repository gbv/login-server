/**
 * Account route.
 */

const config = require("../config")
const utils = require("../utils")

module.exports = app => {

  app.get("/account", (req, res) => {
    if (!req.user) {
      res.redirect("/login")
    } else {
      res.render("account", {
        user: req.user,
        config,
        messages: utils.flashMessages(req),
      })
    }
  })

}
