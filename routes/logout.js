/**
 * /logout route
 */

const events = require("../lib/events")

module.exports = app => {

  app.get("/logout", async (req, res) => {
    // Invalidate session
    const sessionID = req.sessionID, user = req.user
    await req.logout()
    req.flash("success", "You have been logged out.")
    // Fire loggedOut event
    events.userLoggedOut(sessionID, user)
    res.redirect("/login")
  })

}
