/**
 * /sessions route.
 */

const db = require("../utils/db")
const { websockets } = require("../lib/events")

// Load application names
let applications
try {
  applications = require("../applications.json")
} catch (error) {
  applications = []
}

/**
 * Returns a Promise with all sessions for a user.
 *
 * @param {object} user
 * @returns {Promise<object[]>} A Promise with an array of session objects if fulfilled, or an error if rejected.
 */
function sessionsForUser(user) {
  return db.collection("sessions").find({ "session.passport.user": user.id }).toArray()
}

/**
 * Removes a sessionID from the database and closes associated WebSocket connections.
 *
 * @param {string} sessionID
 * @returns {Promise} A fulfilled Promise or an error if rejected.
 */
function removeSession(sessionID) {
  return db.collection("sessions").deleteOne({ _id: sessionID }).then(() => {
    // Explicitly close WebSockets associated with sessionID
    for (let socket of Object.values(websockets).filter(ws => ws && ws.sessionID == sessionID)) {
      if (socket.ws) {
        socket.ws.close()
      }
    }
    return null
  })
}

module.exports = app => {

  app.get("/sessions", (req, res) => {
    if (!req.user) {
      res.redirect("/login")
    } else {
      // Get all sessions from store (via mongoose)
      sessionsForUser(req.user).then(sessions => {
        // Get all websockets associated with one of the sessions
        let ws = Object.values(websockets).filter(ws => ws && sessions.find(session => session._id === ws.sessionID))
        // Add application names to sessions
        sessions.forEach(session => {
          if (!session.session.referrer) {
            return
          }
          const application = applications.find(app => session.session.referrer.includes(app.url))
          session.session.name = (application && application.name) || session.session.referrer
        })
        // Render page
        res.render("sessions", {
          sessions,
          sessionID: req.sessionID,
          websockets: ws,
        })
      })
    }
  })

  // Deletes all sessions for the user (except the current one)
  app.delete("/sessions", (req, res) => {
    if (!req.user) {
      res.status(401).json({ status: 401, message: "Authorization necessary." })
    } else {
      sessionsForUser(req.user).then(sessions => {
        // Filter out current session
        sessions = sessions.filter(session => session._id != req.sessionID)
        // Remove sessions
        Promise.all(sessions.map(session => removeSession(session._id))).then(() => {
          res.status(204).json({ status: 204, ok: true })
        }).catch(error => {
          res.status(500).json({ status: 500, message: "Error deleting sessions: " + error.message })
        })
      })
    }
  })

  // Deletes a single for the user
  app.delete("/sessions/:id", (req, res) => {
    let sessionID = req.params.id
    if (!req.user) {
      res.status(401).json({ status: 401, message: "Authorization necessary." })
    } else {
      sessionsForUser(req.user).then(sessions => {
        // Filter out session to be deleted
        const session = sessions.find(session => session._id == sessionID)
        if (!session) {
          res.status(422).json({ status: 422, message: "Session not found." })
        } else if (req.user.id != session.session.passport.user) {
          res.status(403).json({ status: 403, message: "Can't delete another user's session." })
        } else {
          // Remove session
          removeSession(session._id).then(() => {
            res.status(204).json({ status: 204, ok: true })
          }).catch(error => {
            res.status(500).json({ status: 500, message: "Error deleting session: " + error.message })
          })
        }
      }).catch(error => {
        res.status(500).json({ status: 500, message: "Error deleting sessions: " + error.message })
      })
    }
  })

}
