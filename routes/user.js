/**
 * User routes.
 */

const config = require("../config")
const User = require("../models/user")
const utils = require("../utils")
const _ = require("lodash")
const events = require("../lib/events")

module.exports = app => {

  app.get("/users", (req, res) => {
    res.status(403).json({ status: 403, message: "Unauthorized access to user list." })
    // let query = req.query || {}
    // let conditions = []
    // // Search by URI
    // if (query.uri) {
    //   let uris = query.uri.split("|")
    //   for (let uri of uris) {
    //     conditions.push({ uri })
    //     conditions.push({ merged: uri })
    //     for (let provider of config.providers) {
    //       conditions.push({ [`identities.${provider.id}.uri`]: uri })
    //     }
    //   }
    // }
    // User.find(conditions.length ? { $or: conditions } : {}).then(users => {
    //   res.json(users)
    // }).catch(error => {
    //   console.log(error.message)
    //   res.status(500).json({ status: 500, message: "Could not retrieve users." })
    // })
  })

  app.get("/users/:id", (req, res) => {
    User.findById(req.params.id).lean().then(user => {
      if (user) {
        if (req.user && req.user.id == user._id) {
          utils.addUsageToUserObject(user)
            .then(user => {
              res.json(user)
            })
        } else {
          res.status(403).json({ status: 403, message: "Unauthorized access to user data." })
        }
      } else {
        let uri = `${config.baseUrl}users/${req.params.id}`
        User.findOne({ merged: uri }).then(user => {
          if (user) {
            res.redirect(`/users/${user.id}`)
          } else {
            res.status(404).json({ status: 404, message: "User not found." })
          }
        })
      }
    }).catch(error => {
      config.error(error.message)
      res.status(404).json({ status: 404, message: "User not found." })
    })
  })

  app.patch("/users/:id", (req, res) => {
    let userId = req.params.id
    let user = req.user
    let patch = req.body || {}
    // Currently only able to change name
    patch = _.pick(patch, ["name"])
    if (!user) {
      res.status(401).json({ status: 401, message: "Authorization necessary." })
    } else if (userId != user.id) {
      res.status(403).json({ status: 403, message: "Can't modify another user." })
    } else if (_.isEmpty(patch)) {
      res.status(422).json({ status: 422, message: "No change to be made." })
    } else {
      _.forOwn(patch, (value, key) => {
        user[key] = value
      })
      user.save().then(user => {
        events.userUpdated(req.sessionID, user)
        res.json(user)
      }).catch(error => {
        config.error(error)
        res.status(500).json({ status: 500, message: "Modified user could not be saved." })
      })
    }
  })

  app.get("/currentUser", (req, res) => {
    let user = req.user
    if (user) {
      utils.addUsageToUserObject(user)
        .then(user => {
          res.json(user)
        })
    } else {
      res.status(401).json({ status: 401, message: "Authorization necessary." })
    }
  })

}
