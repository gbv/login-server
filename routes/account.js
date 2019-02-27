/**
 * Account route.
 */

module.exports = app => {

  app.get("/account", (req, res) => {
    if (!req.user) {
      res.redirect("/login")
    } else {
      res.render("account")
    }
  })

}
