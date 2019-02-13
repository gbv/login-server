/**
 * WebSocket
 */

const utils = require("../utils")
const events = require("../lib/events")

module.exports = app => {

  app.ws("/", (ws, req) => {
    // Generate a unique identifier for this WebSocket
    const wsID = utils.uuid()
    let socket = {
      sessionID: req.sessionID,
      ws
    }
    events.addSocket(wsID, socket)

    if (req.user) {
      // Fire loggedIn event
      events.userLoggedInWs(wsID, req.user)
    } else {
      // Fire loggedOut event
      events.userLoggedOutWs(wsID, null)
    }
    ws.on("message", (message) => {
      try {
        message = JSON.parse(message)
        if (message.type === "providers") {
        // Reply with list of providers
          events.sendEvent(wsID, "providers", {
            providers: utils.prepareProviders()
          })
        }
        if (message.type === "token") {
          events.sendToken(wsID)
        }
      } catch(error) {
      // Send error event to WebSocket
        events.error(wsID, "Message could not be parsed.")
      }
    })
    ws.on("close", () => {
    // Remove wsID from websockets
      events.removeSocket(wsID)
    })
  })

}
