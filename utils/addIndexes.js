/**
 * Helper script to add indexes to MongoDB.
 *
 * Run this before first launch and every time a new provider is added to providers.json.
 */

const connection = require("./db")
const providers = require("../providers.json")
const User = require("../models/user")

connection.then(_db => {
  db = _db
  return new Promise((resolve, reject) => {
    const providerIds = providers.map(provider => provider.id)
    let output = ""
    User.schema.index({ uri: 1 })
    output += "- created index: uri\n"
    for (let id of providerIds) {
      User.schema.index({ [`identities.${id}.id`]: 1 })
      User.schema.index({ [`identities.${id}.uri`]: 1 })
      output += `- created index: identities.${id}.id\n`
      output += `- created index: identities.${id}.uri\n`
    }

    // End when indexes were created
    User.ensureIndexes(error => {
      if (!error) {
        console.log(output)
        resolve()
      } else {
        reject("Index could not be created")
      }
    })
    console.log(providerIds)
  })
}).catch(error => {
  console.error("An error occurred:", error)
}).finally(() => {
  db && db.disconnect()
})
