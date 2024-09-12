/**
 * Account route.
 */

export default app => {

  app.get("/account", (req, res) => {
    if (!req.user) {
      res.redirect("/login")
    } else {
      res.render("account")
    }
  })

}
