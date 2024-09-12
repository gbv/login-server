/**
 * /api route.
 */

export default app => {

  app.get("/api", (req, res) => {
    res.render("api")
  })

}
