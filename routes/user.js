/**
 * User routes.
 */

const User = require("../models/user")

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

}
