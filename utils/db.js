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

const connect = async () => {
  try {
    await mongoose.connect(config.database.url, config.database.options)
  } catch(error) {
    console.log(new Date(), "Error connecting to database, trying again in a few seconds...")
    setTimeout(connect, 2500)
  }
}
// Connect immediately on startup
connect()
const db = mongoose.connection

db.on("error", () => {
  mongoose.disconnect()
})
db.on("connected", () => {
  console.log(new Date(), "Connected to database")
})
db.on("disconnected", () => {
  console.warn(new Date(), "Disconnected from database")
})

module.exports = db
