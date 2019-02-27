/**
 * Login route.
 */

module.exports = app => {

  app.get("/login", (req, res) => {
    if (req.user) {
      res.redirect("/account")
    } else {
      res.render("login")
    }
  })

}
