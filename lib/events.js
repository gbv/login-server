const utils = require("../utils")
const config = require("../config")

// List of websockets by session ID
let websockets = {}

// List of token intervals by session ID
let tokenIntervals = {}

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
  // Also send token and start sending tokens regularly
  sendTokenForUser(sessionID, user)
  if (tokenIntervals[sessionID]) {
    clearInterval(tokenIntervals[sessionID])
  }
  // Send token every (expiresIn - 3) seconds
  tokenIntervals[sessionID] = setInterval(() => {
    utils.getUserFromSession(sessionID).then(user => {
      // Get user still succeeded, send token
      sendTokenForUser(sessionID, user)
    }).catch(() => {
      // Could not get user, stop sending tokens
      clearInterval(tokenIntervals[sessionID])
    })
  }, (config.jwtOptions.expiresIn - 3) * 1000)
}
function userLoggedOut(sessionID, user) {
  sendEvent(sessionID, "loggedOut", { user })
  // If there was a tokenInterval, clear it
  if (tokenIntervals[sessionID]) {
    clearInterval(tokenIntervals[sessionID])
  }
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
  // If there was a tokenInterval, clear it
  if (tokenIntervals[sessionID]) {
    clearInterval(tokenIntervals[sessionID])
  }
}

function sendToken(sessionID) {
  utils.getUserFromSession(sessionID).then(user => {
    // Reply with token
    sendTokenForUser(sessionID, user)
  }).catch(() => {
    // Reply with error
    error(sessionID, "Error when reading user or generating token.")
  })
}
function sendTokenForUser(sessionID, user) {
  sendEvent(sessionID, "token", utils.getToken(user))
}

module.exports = {
  sendEvent,
  userLoggedIn,
  userLoggedOut,
  userUpdated,
  error,
  addSocket,
  removeSocket,
  sendToken,
}
