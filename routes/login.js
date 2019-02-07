/**
 * Login home route.
 */

const config = require("../config")
const utils = require("../utils")

module.exports = app => {

  app.get("/login", (req, res) => {
    res.render("home", {
      user: req.user,
      config,
      messages: utils.flashMessages(req),
    })
  })

}
