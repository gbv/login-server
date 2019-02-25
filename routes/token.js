/**
 * Routes related to JSON Web Tokens.
 */

const utils = require("../utils")

module.exports = app => {

  app.get("/token", (req, res) => {
    utils.getToken(req.user, req.sessionID).then(token => {
      res.json(token)
    })
  })

}
