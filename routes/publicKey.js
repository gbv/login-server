/**
 * /publicKey route.
 */

const config = require("../config")

module.exports = app => {

  app.get("/publicKey", (req, res) => {
    res.json({
      publicKey: config.publicKey.toString("utf8"),
      algorithm: config.jwtOptions.algorithm,
    })
  })

}
