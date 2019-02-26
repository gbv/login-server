/**
 * Exports a MongoStore instance that is used to persist sessions.
 */

const config = require("../config")
const session = require("express-session")
const MongoStore = require("connect-mongo")(session)
const mongoStore = new MongoStore({
  url: config.database.url,
  stringify: false,
})

module.exports = mongoStore
