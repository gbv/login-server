/**
 * User routes.
 */

const User = require("../models/user")
const _ = require("lodash")
const events = require("../lib/events")

module.exports = app => {

  // TODO: Should this be accessible?
  app.get("/users", (req, res) => {
    User.find().then(users => {
      res.json(users)
    }).catch(error => {
      console.log(error.message)
      res.sendStatus(422)
    })
  })

  app.get("/users/:id", (req, res) => {
    User.findById(req.params.id).then(user => {
      res.json(user)
    }).catch(error => {
      console.log(error.message)
      res.sendStatus(404)
    })
  })

  app.patch("/users/:id", (req, res) => {
    let userId = req.params.id
    let user = req.user
    let patch = req.body || {}
    // Currently only able to change name
    patch = _.pick(patch, ["name"])
    if (!user) {
      res.sendStatus(401)
    } else if (userId != user.id) {
      res.sendStatus(403)
    } else if (_.isEmpty(patch)) {
      res.sendStatus(400)
    } else {
      _.forOwn(patch, (value, key) => {
        user[key] = value
      })
      user.save().then(user => {
        events.userUpdated(req.sessionID, user)
        res.json(user)
      }).catch(() => {
        res.sendStatus(400)
      })
    }
  })

  app.get("/currentUser", (req, res) => {
    let user = req.user
    if (user) {
      res.json(user)
    } else {
      res.sendStatus(404)
    }
  })

}
