import config from "../config.js"
import { MongoMemoryServer } from "mongodb-memory-server"

const { groups } = new RegExp("^mongodb://127\\.0\\.0\\.1:(?<port>[0-9]+)/(?<dbName>.+)$").exec(config.database.url)
groups.port = parseInt(groups.port)

const server = await MongoMemoryServer.create({ instance: groups })
console.log(`Started MongoDB ${server.getUri()} database ${groups.dbName}`)
