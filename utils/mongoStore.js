/**
 * Exports a MongoStore instance that is used to persist sessions.
 */

// const config = require("../config")
const { connection } = require("./db")
const session = require("express-session")
const MongoStore = require("connect-mongo")(session)
const mongoStore = new MongoStore({
  mongooseConnection: connection,
  stringify: false,
})

// Workaround for connection failures in the mongoose connection.
// Without this, the MongoStore will not work even if the mongoose connection is reconnected.
connection.on("connected", async () => {
  // handleNewConnectionAsync sometimes throws an error while still doing what it should for us.
  try {
    await mongoStore.handleNewConnectionAsync(connection)
  } catch(error) {
    // Ignore error
  }
})

module.exports = mongoStore
