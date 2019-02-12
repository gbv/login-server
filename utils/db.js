/**
 * Configuration object for Mongoose database connection.
 *
 * Only needs to be called once at application startup, for example:
 * ```javascript
 * require("./utils/db").then(() => {
 *   // Properly start application (e.g. start express server, etc.)
 * })
 * ```
 */

const config = require("../config")
const mongoose = require("mongoose")
mongoose.Promise = global.Promise
mongoose.set("useFindAndModify", false)

const connection = mongoose.connect(config.database.url, config.database.options)

connection.then(db => {
  console.log("Connceted to database.")
  return db
}).catch(err => {
  // TODO: Improve error handling.
  // TODO: How to automatically reconnect to database?
  if (err.message.code === "ETIMEDOUT") {
    console.log("Attempting to re-establish database connection.")
    mongoose.connect(config.database.url, config.database.options)
  } else {
    console.error("Error while attempting to connect to database:")
  }
})

module.exports = connection
