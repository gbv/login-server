/**
 * /delete routes
 */

const events = require("../lib/events")
const User = require("../models/user")

module.exports = app => {

  app.get("/delete", (req, res) => {
    res.render("delete")
  })

  // We need to use POST here because DELETE can't be opened by the browser.
  app.post("/delete", async (req, res) => {
    const sessionID = req.sessionID, user = req.user
    await req.logout()
    User.findByIdAndRemove(user.id).then(() => {
    // Fire loggedOut event
      events.userLoggedOut(sessionID)
      req.flash("success", "Your user account has been deleted.")
    }).catch(() => {
      req.flash("error", "There was an error when trying to delete your user account.")
    }).then(() => {
      req.user = undefined
      res.redirect("/login")
    })
  })

}
