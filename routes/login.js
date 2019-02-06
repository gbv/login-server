/**
 * Login home route.
 */

const config = require("../config")

module.exports = app => {

  app.get("/login", (req, res) => {
    res.render("home", { user: req.user, config })
  })

}
