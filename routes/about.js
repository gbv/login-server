/**
 * /about route.
 */

const utils = require("../utils")

module.exports = app => {

  app.get("/about", (req, res) => {
    res.json(utils.prepareAbout())
  })

}
