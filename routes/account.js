/**
 * Account route.
 */

const utils = require("../utils")

module.exports = app => {

  app.get("/account", (req, res) => {
    if (!req.user) {
      res.redirect("/login")
    } else {
      res.render("account", {
        user: req.user,
        messages: utils.flashMessages(req),
      })
    }
  })

}
