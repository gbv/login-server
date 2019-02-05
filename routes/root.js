/**
 * Routes at root level.
 */

const config = require("../config")

module.exports = app => {

  app.get("/", (req, res) => {
    res.render("home", { user: req.user, config })
  })

}
