/**
 * WebSocket
 */

const utils = require("../utils")
const events = require("../lib/events")

module.exports = app => {

  app.ws("/", (ws, req) => {
  // Add sessionID to websockets
    const sessionID = req.sessionID
    events.addSocket(sessionID, ws)

    if (req.user) {
    // Fire loggedIn event
      events.userLoggedIn(sessionID, req.user)
    }
    ws.on("message", (message) => {
      try {
        message = JSON.parse(message)
        if (message.type === "providers") {
        // Reply with list of providers
          events.sendEvent(sessionID, "providers", {
            providers: utils.prepareProviders()
          })
        }
      } catch(error) {
      // Send error event to WebSocket
        events.error(sessionID, "Message could not be parsed.")
      }
    })
    ws.on("close", () => {
    // Remove sessionID from websockets
      events.removeSocket(sessionID)
    })
  })

}
