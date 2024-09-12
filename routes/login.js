/**
 * Login route.
 */

import * as utils from "../utils/index.js"

export default app => {

  app.get("/login", (req, res) => {
    utils.saveReferrerInSession(req)
    if (req.user) {
      res.redirect("/account")
    } else {
      res.render("login")
    }
  })

}
