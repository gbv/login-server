/**
 * Base (/) route.
 */

module.exports = app => {

  app.get("/", (req, res) => {
    if (req.user) {
      res.redirect("/account")
    } else {
      res.redirect("/login")
    }
  })

}
