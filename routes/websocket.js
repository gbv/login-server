/**
 * WebSocket
 */

const config = require("../config")
const utils = require("../utils")
const mongoStore = require("../utils/mongoStore")
const events = require("../lib/events")
const jwt = require("jsonwebtoken")

module.exports = app => {

  app.ws("/", (ws, req) => {
    // Generate a unique identifier for this WebSocket
    const wsID = utils.uuid()
    let socket = {
      sessionID: req.sessionID,
      ws,
    }
    events.addSocket(wsID, socket)

    events.sendEvent(wsID, "open", null)

    // Send information about the server as well as the list of providers.
    events.sendEvent(wsID, "about", utils.prepareAbout())
    events.sendEvent(wsID, "providers", {
      providers: utils.prepareProviders(),
    })

    // Check if sessionID already exists in store. If yes, consider connection authenticated.
    mongoStore.get(req.sessionID).then(session => {
      if (session) {
        events.sendEvent(wsID, "authenticated")
      }
    }).catch(() => {})


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
        if (message.type === "authenticate") {
          // Handle authentication via JWT
          let token = message.token
          try {
            let decodedToken = jwt.verify(token, config.publicKey)
            let sessionID = config.key.decrypt(decodedToken.sessionID).toString("utf8")
            socket.sessionID = sessionID
            // Send authenticated event
            events.sendEvent(wsID, "authenticated")
            // Get user for session and send login/logout event
            utils.getUserFromSession(sessionID).catch(() => null).then(user => {
              if (user) {
                events.userLoggedInWs(wsID, user)
              } else {
                events.userLoggedOutWs(wsID, null)
              }
            })
          } catch(error) {
            events.error(wsID, "Authentication failed.")
          }
        } else if (message.type === "ping") {
          events.sendEvent(wsID, "pong")
        } else {
          events.error(wsID, `Unknown requets type ${message.type}.`)
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
