/**
 * Mongoose database connection.
 *
 * `connect` needs to be called once at application startup, for example:
 * ```javascript
 * const { connection, connect } = require("./utils/db")
 * connect(true)
 * ```
 *
 * You can use either `connection.readyState` to detect the database status,
 * and `connection.once("open", callback)` to detect an open connection.
 */

const config = require("../config")
const mongoose = require("mongoose")
const connection = mongoose.connection

// Set mongoose buffering options
mongoose.set("bufferCommands", true)
mongoose.set("bufferTimeoutMS", 30000)

connection.on("connected", () => {
  config.log("Connected to database")
})
const onDisconnected = () => {
  config.warn("Disconnected from database, waiting for automatic reconnect...")
}

module.exports = {
  mongoose,
  connection,
  async connect(retry = false) {
    connection.on("disconnected", onDisconnected)
    function addErrorHandler() {
      connection.on("error", (error) => {
        config.error("Database error", error)
      })
    }
    // If retry === false, add error handler before connecting
    !retry && addErrorHandler()
    async function _connect() {
      return await mongoose.connect(config.database.url, config.database.options)
    }
    let result
    while (!result) {
      try {
        result = await _connect()
      } catch (error) {
        if (!retry) {
          throw error
        }
        config.error(error)
      }
      if (!result) {
        config.error("Error connecting to database, trying again in 10 seconds...")
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    }
    // If retry === true, add error handler after connecting
    retry && addErrorHandler()
    return result
  },
  disconnect() {
    connection.removeListener("disconnected", onDisconnected)
    config.log("Disconnected from database (on purpose)")
    return mongoose.disconnect()
  },
}
