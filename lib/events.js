const utils = require("../utils")
const config = require("../config")

/**
 * List of websockets of format
 * {
 *   [wsID]: {
 *     id: string,
 *     ws: WebSocket,
 *     sessionID: string
 *   }
 * }
 */
let websockets = {}

/**
 * Lists all WebSockets the have a specific sessionID attached to them.
 *
 * @param {string} sessionID
 * @returns {object[]}
 */
function websocketsForSession(sessionID) {
  return Object.values(websockets).filter(socket => socket && socket.sessionID == sessionID)
}

// List of token intervals
let tokenIntervals = {}

/**
 * Helper method for sending socket messages about session events to a specific WebSocket
 *
 * @param {string} wsID
 * @param {string} event
 * @param {object} data
 */
function sendEvent(wsID, event, data) {
  let socket = websockets[wsID]
  if (socket && socket.ws && socket.ws.readyState == 1) {
    socket.ws.send(JSON.stringify({
      type: event,
      date: (new Date()).toISOString(),
      data,
    }))
  }
}

/**
 * Helper method for sending socket messages about session events to all WebSockets for that session
 *
 * @param {string} sessionID
 * @param {string} event
 * @param {object} data
 */
function sendSessionEvent(sessionID, event, data) {
  for (let { id } of websocketsForSession(sessionID)) {
    sendEvent(id, event, data)
  }
}

/**
 * Internal method to handle login for a specific WebSocket
 *
 * @param {string} wsID
 * @param {object} user
 */
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
    }).catch(error => {
      // Could not get user, stop sending tokens except for Mongo errors
      if (!["MongoError", "MongoNetworkError"].includes(error.constructor.name)) {
        clearInterval(tokenIntervals[wsID])
      }
    })
  }, (config.jwtOptions.expiresIn - 3) * 1000)
}

/**
 * Internal method to handle logout for a specific WebSocket
 *
 * @param {string} wsID
 * @param {object} user
 */
function userLoggedOutWs(wsID, user) {
  sendEvent(wsID, "loggedOut", { user })

  // If there was a tokenInterval, clear it
  if (tokenIntervals[wsID]) {
    clearInterval(tokenIntervals[wsID])
  }
}

/**
 * ##### Event methods for session changes #####
 */

/**
 * To be called when user has logged in (or was already logged in after WebSocket is established).
 *
 * @param {string} sessionID
 * @param {object} user
 */
function userLoggedIn(sessionID, user) {
  for (let { id } of websocketsForSession(sessionID)) {
    userLoggedInWs(id, user)
  }
}
/**
 * To be called when user has logged out (or was logged out after WebSocket is established).
 *
 * @param {string} sessionID
 * @param {object} user
 */
function userLoggedOut(sessionID, user) {
  for (let { id } of websocketsForSession(sessionID)) {
    userLoggedOutWs(id, user)
  }
}
/**
 * To be called when user has been updated (e.g. name change, connected new account, etc.).
 *
 * @param {string} sessionID
 * @param {object} user
 */
function userUpdated(sessionID, user) {
  sendSessionEvent(sessionID, "updated", { user })
}

/**
 * Method for error event
 *
 * @param {string} wsID
 * @param {string} message
 */
function error(wsID, message) {
  sendEvent(wsID, "error", { message })
}

/**
 * Adds a new socket to send events to.
 *
 * @param {string} wsID - unique socket identifier
 * @param {WebSocket} socket - an object containing the WebSocket (socket.ws) and the sessionID (socket.sessionID)
 */
function addSocket(wsID, socket) {
  socket.id = wsID
  websockets[wsID] = socket
}
/**
 * Removes a WebSocket from the list (to be called after WebSocket was closed).
 *
 * @param {string} wsID
 */
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
 * @param {string} wsID
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
/**
 * Helper method for sending a JWT to a certain WebSocket for a user.
 *
 * @param {string} wsID
 * @param {object} user
 */
function sendTokenForUser(wsID, user) {
  utils.getToken(user).then(token => {
    sendEvent(wsID, "token", token)
  })
}

// Interval that checks sessions that are about to expire and notifies them.
const { connection } = require("../utils/db")
setInterval(() => {
  // Only make request if the database is connected.
  if (connection.readyState === 1) {
    connection.collection("sessions")
      // Find sessions that will expire soon
      .find({ expires: { $gte: new Date(), $lt: new Date((new Date()).getTime() + config.sessionExpirationMessageThreshold * 60000) } })
      .toArray()
      .then(sessions => {
        for (let session of sessions) {
          sendSessionEvent(session._id, "sessionAboutToExpire", {})
        }
      })
      // Ignore errors
      .catch(() => {})
  }
}, 1000 * 60 * config.sessionExpirationMessageInterval)

module.exports = {
  websockets,
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
