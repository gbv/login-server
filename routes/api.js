/**
 * /api route.
 */

module.exports = app => {

  app.get("/api", (req, res) => {
    res.render("api", {
      showLoginButton: true,
    })
  })

}
