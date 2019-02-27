/**
 * /disconnect route
 */

const _ = require("lodash")
const events = require("../lib/events")

module.exports = app => {

  // Disconnect route
  app.get("/disconnect/:provider", (req, res) => {
    let user = req.user
    let provider = req.params.provider
    if (user && user.identities && user.identities[provider]) {
      if (user.identities.length < 2) {
      // Don't disconnect if it's the only provider left
        req.flash("error", "You can't disconnect your last connected identity.")
        res.redirect("/login")
        return
      }
      let identities = _.omit(user.identities, [provider])
      user.set("identities", {})
      user.set("identities", identities)
      // TODO: Error handling.
      user.save().then(user => {
      // Fire updated event
        events.userUpdated(req.sessionID, user)
        req.flash("success", "Identity disconnected.")
      }).catch(() => {
        req.flash("error", "Identity could not be disconnected.")
      }).finally(() => {
        res.redirect("/login")
      })
    } else {
      if (user) {
        req.flash("warning", "You can't disconnect an identity that is not connected.")
      } else {
        req.flash("error", "You need to be logged in to disconnect an identity.")
      }
      res.redirect("/login")
    }
  })

}
