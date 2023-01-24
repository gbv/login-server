/**
 * Exports a MongoStore instance that is used to persist sessions.
 */

const db = require("./db")
const MongoStore = require("connect-mongo")
const mongoStore = MongoStore.create({
  clientPromise: db.connect(true).then(m => m.connection.getClient()),
  stringify: false,
})

// Promisify certain methods on MongoStore instance
const util = require("util")
;["length", "clear", "get", "set", "all", "touch", "destroy", "close"].forEach(name => {
  const method = mongoStore[name]
  mongoStore[name] = util.promisify(method).bind(mongoStore)
})

module.exports = mongoStore
