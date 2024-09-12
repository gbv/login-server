/**
 * /logout route
 */

import * as events from "../lib/events.js"

export default app => {

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
