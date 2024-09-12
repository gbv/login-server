/**
 * Exports a MongoStore instance that is used to persist sessions.
 */

import { connect } from "./db.js"
import MongoStore from "connect-mongo"
const mongoStore = MongoStore.create({
  clientPromise: connect(true).then(m => m.connection.getClient()),
  stringify: false,
})

// Promisify certain methods on MongoStore instance
import util from "node:util"
;["length", "clear", "get", "set", "all", "touch", "destroy", "close"].forEach(name => {
  const method = mongoStore[name]
  mongoStore[name] = util.promisify(method).bind(mongoStore)
})

export default mongoStore
