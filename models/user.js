/**
 * Mongoose Schema for a User.
 *
 * Note: The property `identities` is defined as type "Schema.Types.Mixed" because it's not possible to define dynamic object keys in Mongoose.
 * It should contain key-value-pairs with the key being the provider/strategy and the value being a profile object with keys `id`, `uri`, `name`, and `username`.
 */

const mongoose = require("mongoose")
const Schema = mongoose.Schema

const userSchema = new Schema({
  _id: String,
  uri: String,
  name: String,
  identities: Schema.Types.Mixed,
  mergedUsers: [String],
}, { versionKey: false })

module.exports = mongoose.model("User", userSchema)
