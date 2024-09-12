/**
 * Help route.
 */

export default app => {

  app.get("/help", (req, res) => {
    res.render("help")
  })

}
