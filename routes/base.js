/**
 * Base (/) route.
 */

const utils = require("../utils")

module.exports = app => {

  app.get("/", (req, res) => {
    res.render("base", {
      user: req.user,
      messages: utils.flashMessages(req),
    })
  })

}
