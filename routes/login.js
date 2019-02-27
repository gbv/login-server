/**
 * Login route.
 */

const utils = require("../utils")

module.exports = app => {

  app.get("/login", (req, res) => {
    if (req.user) {
      res.redirect("/account")
    } else {
      res.render("login", {
        user: null,
        messages: utils.flashMessages(req),
      })
    }
  })

}
