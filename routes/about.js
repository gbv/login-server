/**
 * /about route.
 */

const config = require("../config")

module.exports = app => {

  app.get("/about", (req, res) => {
    res.json({
      title: config.title,
      env: config.env,
      publicKey: config.publicKey.toString("utf8"),
      algorithm: config.jwtOptions.algorithm,
    })
  })

}
