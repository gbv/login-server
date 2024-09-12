/**
 * Routes related to JSON Web Tokens.
 */

import * as utils from "../utils/index.js"

export default app => {

  app.get("/token", (req, res) => {
    utils.getToken(req.user, req.sessionID).then(token => {
      res.json(token)
    })
  })

}
