/**
 * Mongoose Schema for a user's usage data.
 */

const mongoose = require("mongoose")
const Schema = mongoose.Schema

const usageSchema = new Schema({
  _id: String,
  lastUsed: String,
}, { versionKey: false })

module.exports = mongoose.model("Usage", usageSchema)
