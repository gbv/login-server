/**
 * /logout route
 */

const events = require("../lib/events")

module.exports = app => {

  app.get("/logout", async (req, res) => {
  // Note: Note sure if `await` is even applicable here, or if `req.user = undefined` makes sense, but it seems to help with #3.
  // Invalidate session
    await req.logout()
    req.flash("success", "You were logged out.")
    // Fire loggedOut event
    events.userLoggedOut(req.sessionID, req.user)
    req.user = undefined
    res.redirect("/login")
  })

}
