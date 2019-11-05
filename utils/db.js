/**
 * Configuration object for Mongoose database connection.
 *
 * Only needs to be called once at application startup, for example:
 * ```javascript
 * const db = require("./utils/db")
 * ```
 *
 * You can use either `db.readyState` to detect the database status,
 * and `db.once("open", callback)` to detect an open connection.
 */

const config = require("../config")
const mongoose = require("mongoose")
mongoose.Promise = global.Promise
mongoose.set("useFindAndModify", false)
mongoose.set("useUnifiedTopology", true)

const connect = async () => {
  try {
    await mongoose.connect(config.database.url, config.database.options)
  } catch(error) {
    console.log("Error connecting to database, reconnect in a few seconds...")
  }
}
// Connect immediately on startup
connect()
const db = mongoose.connection

db.on("error", () => {
  mongoose.disconnect()
})
db.on("connected", () => {
  console.log("Connected to database")
})
db.on("disconnected", () => {
  console.warn("Disconnected from database")
  setTimeout(connect, 2500)
})

module.exports = db
