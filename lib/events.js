const utils = require("../utils")
const config = require("../config")

// List of websockets
let websockets = {}

function websocketsForSession(sessionID) {
  return Object.values(websockets).filter(socket => socket.sessionID == sessionID)
}

// List of token intervals
let tokenIntervals = {}

// Helper method for sending socket messages about session events to a specific WebSocket
function sendEvent(wsID, event, data) {
  let socket = websockets[wsID]
  if (socket && socket.ws) {
    socket.ws.send(JSON.stringify({
      type: event,
      date: (new Date()).toISOString(),
      data
    }))
  }
}
// Helper method for sending socket messages about session events to all WebSockets for that session
function sendSessionEvent(sessionID, event, data) {
  for (let { id } of websocketsForSession(sessionID)) {
    sendEvent(id, event, data)
  }
}
// Internal method to handle login for a specific WebSocket
function userLoggedInWs(wsID, user) {
  sendEvent(wsID, "loggedIn", { user })

  const sessionID = websockets[wsID] && websockets[wsID].sessionID
  if (!sessionID) {
    console.warn("No sessionID for WebSocket", wsID)
    return
  }
  // Send token and start sending tokens regularly
  sendTokenForUser(wsID, user)
  if (tokenIntervals[wsID]) {
    clearInterval(tokenIntervals[wsID])
  }
  // Send token every (expiresIn - 3) seconds
  tokenIntervals[wsID] = setInterval(() => {
    utils.getUserFromSession(sessionID).then(user => {
      // Get user still succeeded, send token
      sendTokenForUser(wsID, user)
    }).catch(() => {
      // Could not get user, stop sending tokens
      clearInterval(tokenIntervals[wsID])
    })
  }, (config.jwtOptions.expiresIn - 3) * 1000)
}
// Internal method to handle logout for a specific WebSocket
function userLoggedOutWs(wsID, user) {
  sendEvent(wsID, "loggedOut", { user })

  // If there was a tokenInterval, clear it
  if (tokenIntervals[wsID]) {
    clearInterval(tokenIntervals[wsID])
  }
}

// Event methods for session changes
function userLoggedIn(sessionID, user) {
  for (let { id } of websocketsForSession(sessionID)) {
    userLoggedInWs(id, user)
  }
}
function userLoggedOut(sessionID, user) {
  for (let { id } of websocketsForSession(sessionID)) {
    userLoggedOutWs(id, user)
  }
}
function userUpdated(sessionID, user) {
  sendSessionEvent(sessionID, "updated", { user })
}

// Method for error event
function error(wsID, message) {
  sendEvent(wsID, "error", { message })
}

/**
 * Adds a new socket to send events to.
 *
 * @param {*} wsID - unique socket identifier
 * @param {*} socket - an object containing the WebSocket (socket.ws) and the sessionID (socket.sessionID)
 */
function addSocket(wsID, socket) {
  socket.id = wsID
  websockets[wsID] = socket
}
function removeSocket(wsID) {
  websockets[wsID] = undefined
  // If there was a tokenInterval, clear it
  if (tokenIntervals[wsID]) {
    clearInterval(tokenIntervals[wsID])
  }
}

/**
 * Sends a new JWT to a certain WebSocket.
 *
 * @param {*} wsID
 */
function sendToken(wsID) {
  if (!websockets[wsID]) {
    console.warn("Can't send token to non-existent WebSocket", wsID)
    return
  }
  const { sessionID } = websockets[wsID]
  utils.getUserFromSession(sessionID).then(user => {
    // Reply with token
    sendTokenForUser(wsID, user)
  }).catch(() => {
    // Reply with error
    error(wsID, "Error when reading user or generating token.")
  })
}
function sendTokenForUser(wsID, user) {
  sendEvent(wsID, "token", utils.getToken(user))
}

module.exports = {
  sendEvent,
  userLoggedInWs,
  userLoggedOutWs,
  userLoggedIn,
  userLoggedOut,
  userUpdated,
  error,
  addSocket,
  removeSocket,
  sendToken,
}
