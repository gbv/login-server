/**
 * Configuration
 *
 * A .env file is required.
 * Required keys: PORT
 * Recommennded keys: BASE_URL, NODE_ENV, SESSION_SECRET
 * Optional keys: MONGO_USER, MONGO_PASS, MONGO_HOST, MONGO_PORT, MONGO_DB, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX
 *
 */
require("dotenv").config()
const fs = require("fs")
const nodersa = require("node-rsa")
const jwt = require("jsonwebtoken")

const
  env = process.env.NODE_ENV || "development",
  baseUrl = process.env.BASE_URL || `http://localhost${process.env.PORT ? ":" + process.env.PORT : ""}`,
  port = process.env.PORT,
  sessionSecret = process.env.SESSION_SECRET || "keyboard cat",
  mongoUser = process.env.MONGO_USER || "",
  mongoPass = process.env.MONGO_PASS || "",
  mongoAuth = mongoUser ? `${mongoUser}:${mongoPass}@` : "",
  mongoHost = process.env.MONGO_HOST || "localhost",
  mongoPort = process.env.MONGO_PORT || 27017,
  mongoDb = (process.env.MONGO_DB || "cocoda-userdb") + (env == "test" ? "-test" : ""),
  mongoUrl = `mongodb://${mongoAuth}${mongoHost}:${mongoPort}/${mongoDb}`,
  mongoOptions = {
    reconnectTries: 60,
    reconnectInterval: 1000,
    useNewUrlParser: true
  },
  rateLimitWindow = process.env.RATE_LIMIT_WINDOW || (60 * 1000),
  rateLimitMax = process.env.RATE_LIMIT_MAX || 10,
  privateKeyPath = process.env.JTW_PRIVATE_KEY_PATH,
  publicKeyPath = process.env.JTW_PUBLIC_KEY_PATH,
  jwtAlgorithm = process.env.JWT_ALGORITHM || "RS256"
let jwtExpiresIn = parseInt(process.env.JWT_EXPIRES_IN) || 120
if (jwtExpiresIn < 10) {
  console.warn("Warning: Minimum for JWT_EXPIRES_IN is 10 seconds.")
  jwtExpiresIn = 10
}

let config = {
  env,
  baseUrl,
  port,
  database: {
    url: mongoUrl,
    options: mongoOptions,
  },
  sessionSecret,
  rateLimitOptions: {
    windowMs: rateLimitWindow,
    max: rateLimitMax,
  },
  jwtOptions: {
    algorithm: jwtAlgorithm,
    expiresIn: jwtExpiresIn
  },
}

/**
 * ##### RSA Key Setup #####
 */

let privateKey, publicKey
try {
  privateKey = fs.readFileSync(privateKeyPath || "./private.key")
  publicKey = fs.readFileSync(publicKeyPath || "./public.key")
  // Test keys by using jwt
  let testToken = jwt.sign({ test: "test" }, privateKey, config.jwtOptions)
  jwt.verify(testToken, publicKey)
  console.log("Loaded RSA keypair.")
} catch(error) {
  if (privateKeyPath || publicKeyPath || privateKey || publicKey) {
    let errorName = error.name
    let errorCode = error.code
    if (errorName === "Error" && errorCode === "ENOENT") {
      console.error(`Error: Could not find key at path ${error.path}.`)
    } else if (errorName === "JsonWebTokenError") {
      console.error("Error: Testing provided keypair failed (could not verify a signed token).")
    } else {
      console.error(`Error: Unkown error when loading keypair. (${errorName}, ${errorCode}, ${error.message})`)
    }
    process.exit(1)
  }
  console.log("Generating new keypair and saving to `./private.key` and `./public.key`...")
  let key = new nodersa({ b: 2048 })
  privateKey = key.exportKey("private")
  publicKey = key.exportKey("public")
  // Save keys to files
  fs.writeFileSync("./private.key", privateKey)
  fs.writeFileSync("./public.key", publicKey)
}
config.privateKey = privateKey
config.publicKey = publicKey

/**
 * ##### Providers Setup #####
 */

if (env != "test") {
  // Load providers
  try {
    config.providers = require("./providers.json")
  } catch(error) {
    config.providers = []
  }
  // Prepare providers
  for (let provider of config.providers) {
    provider.loginURL = `${baseUrl}/login/${provider.id}`,
    provider.callbackURL = `${baseUrl}/login/${provider.id}/return`
  }
} else {
  // Configure a test provider for tests
  config.providers = [
    {
      id: "test",
      strategy: "test",
      name: "Test",
      credentialsNecessary: true,
      options: {
        users: [
          {
            username: "testuser",
            password: "testtest",
            displayName: "A Test User"
          }
        ]
      }
    }
  ]
}


module.exports = config
