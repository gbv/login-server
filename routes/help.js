/**
 * Help route.
 */

module.exports = app => {

  app.get("/help", (req, res) => {
    res.render("help")
  })

}
