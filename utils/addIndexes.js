/**
 * Helper script to add indexes to MongoDB.
 *
 * Run this before first launch and every time a new provider is added to providers.json.
 */

import { connect, disconnect } from "./db.js"
import User from "../models/user.js"
import { readJSON } from "../config.js"

import dotenv from "dotenv"
dotenv.config()
let providersFile = process.env.PROVIDERS_PATH || "./providers.json"
if (!providersFile.startsWith("/")) {
  providersFile = `./${providersFile}`
}
const providers = readJSON(providersFile)

await connect()

try {
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
  await User.ensureIndexes()
  console.log(output)
  console.log(providerIds)

} catch (error) {
  console.error("An error occurred:", error)
}
await disconnect()
// Force exit because database will try to reconnect automatically
process.exit(0)
