/**
 * Providers route.
 */

const utils = require("../utils")

module.exports = app => {

  app.get("/providers", (req, res) => {
    res.json(utils.prepareProviders())
  })

}
