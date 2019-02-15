/**
 * Routes related to JSON Web Tokens.
 */

const config = require("../config")
const utils = require("../utils")

module.exports = app => {

  app.get("/publicKey", (req, res) => {
    res.json({
      publicKey: config.publicKey.toString("utf8"),
      algorithm: config.jwtOptions.algorithm,
    })
  })

  app.get("/token", (req, res) => {
    utils.getToken(req.user, req.sessionID).then(token => {
      res.json(token)
    })
  })

}
