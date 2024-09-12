/**
 * Mongoose Schema for a user's usage data.
 */

import mongoose from "mongoose"
const Schema = mongoose.Schema

const usageSchema = new Schema({
  _id: String,
  created: String,
  lastUsed: String,
}, { versionKey: false })

export default mongoose.model("Usage", usageSchema)
