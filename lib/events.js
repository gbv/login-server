
// List of websockets by session ID
let websockets = {}

// Helper method for sending socket messages about session events
function sendEvent(sessionID, event, data) {
  let socket = websockets[sessionID]
  if (socket) {
    socket.send(JSON.stringify({
      type: event,
      date: (new Date()).toISOString(),
      data
    }))
  }
}
// Event methods for session changes
function userLoggedIn(sessionID, user) {
  sendEvent(sessionID, "loggedIn", { user })
}
function userLoggedOut(sessionID, user) {
  sendEvent(sessionID, "loggedOut", { user })
}
function userUpdated(sessionID, user) {
  sendEvent(sessionID, "updated", { user })
}
function error(sessionID, message) {
  sendEvent(sessionID, "error", { message })
}

function addSocket(sessionID, ws) {
  websockets[sessionID] = ws
}
function removeSocket(sessionID) {
  websockets[sessionID] = undefined
}

module.exports = {
  sendEvent,
  userLoggedIn,
  userLoggedOut,
  userUpdated,
  error,
  addSocket,
  removeSocket,
}
