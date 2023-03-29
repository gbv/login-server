/**
 * Configuration
 *
 * A .env file is required.
 * Recommennded keys: PORT, BASE_URL, NODE_ENV, SESSION_SECRET
 * Optional keys: MONGO_USER, MONGO_PASS, MONGO_HOST, MONGO_PORT, MONGO_DB, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX
 *
 */
require("dotenv").config()
const fs = require("fs")
const url = require("url")
const rsa = require("node-rsa")
const jwt = require("jsonwebtoken")

const
  env = process.env.NODE_ENV || "development",
  port = parseInt(process.env.PORT) || 3004
let baseUrl = process.env.BASE_URL || `http://localhost${port != 80 ? ":" + port : ""}`
const
  sessionSecret = process.env.SESSION_SECRET || "keyboard cat",
  mongoUser = process.env.MONGO_USER || "",
  mongoPass = process.env.MONGO_PASS || "",
  mongoAuth = mongoUser ? `${mongoUser}:${mongoPass}@` : "",
  mongoHost = process.env.MONGO_HOST || "localhost",
  mongoPort = process.env.MONGO_PORT || 27017,
  mongoDb = (process.env.MONGO_DB || "login-server") + (env == "test" ? "-test" : ""),
  mongoUrl = `mongodb://${mongoAuth}${mongoHost}:${mongoPort}/${mongoDb}`,
  mongoOptions = {
    connectTimeoutMS: 120000,
    socketTimeoutMS: 120000,
    heartbeatFrequencyMS: 10000,
  },
  rateLimitWindow = process.env.RATE_LIMIT_WINDOW || (60 * 1000),
  rateLimitMax = process.env.RATE_LIMIT_MAX || 10,
  privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || "./private.key",
  publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || "./public.key",
  jwtAlgorithm = process.env.JWT_ALGORITHM || "RS256",
  title = process.env.TITLE || "Login Server",
  packageData = require("./package.json"),
  urls = {
    imprint: process.env.IMPRINT_URL,
    privacy: process.env.PRIVACY_URL,
    sources: process.env.SOURCES_URL || packageData.homepage || "https://github.com/gbv/login-server",
  },
  cookieMaxDays = process.env.COOKIE_MAX_DAYS || 30,
  sessionExpirationMessageThreshold = process.env.SESSION_EXPIRATION_MESSAGE_THRESHOLD || 60,
  sessionExpirationMessageInterval = process.env.SESSION_EXPIRATION_MESSAGE_INTERVAL || 5,
  verbosity = process.env.VERBOSITY

let allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(origin => origin != "")

// Make sure baseUrl has a trailing slash
if (!baseUrl.endsWith("/")) {
  baseUrl += "/"
}

let purl = url.parse(baseUrl)
if (!["http:", "https:"].includes(purl.protocol) || !purl.slashes || !purl.hostname) {
  console.error("Please provide a full BASE_URL in .env.")
  process.exit(1)
}
allowedOrigins.push(`${purl.protocol}//${purl.hostname}${purl.port && purl.port != 80 && purl.port != 443 ? ":" + purl.port : ""}`)

// Add base URL without protocol and information about SSL
const
  cleanUrl = baseUrl.replace(`${purl.protocol}//`, ""),
  ssl = purl.protocol == "https:"

let jwtExpiresIn = parseInt(process.env.JWT_EXPIRES_IN) || 120
if (jwtExpiresIn < 10) {
  console.warn("Warning: Minimum for JWT_EXPIRES_IN is 10 seconds.")
  jwtExpiresIn = 10
}

let config = {
  env,
  baseUrl,
  cleanUrl,
  ssl,
  isLocal: !process.env.BASE_URL,
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
    expiresIn: jwtExpiresIn,
  },
  allowedOrigins,
  title,
  package: packageData,
  urls,
  cookieMaxDays,
  sessionExpirationMessageThreshold,
  sessionExpirationMessageInterval,
  verbosity,
}

// Logging
if (![true, false, "log", "warn", "error"].includes(config.verbosity)) {
  const defaultVerbosity = "log"
  config.verbosity !== undefined && console.warn(`Invalid verbosity value "${config.verbosity}", defaulting to "${defaultVerbosity}" instead.`)
  config.verbosity = defaultVerbosity
}
config.log = (...args) => {
  if (env != "test" && (config.verbosity === true || config.verbosity === "log")) {
    console.log(new Date(), ...args)
  }
}
config.warn = (...args) => {
  if (env != "test" && (config.verbosity === true || config.verbosity === "log" || config.verbosity === "warn")) {
    console.warn(new Date(), ...args)
  }
}
config.error = (...args) => {
  if (env != "test" && config.verbosity !== false) {
    console.error(new Date(), ...args)
  }
}

/**
 * ##### RSA Key Setup #####
 */

let privateKey, publicKey
try {
  privateKey = fs.readFileSync(privateKeyPath)
  publicKey = fs.readFileSync(publicKeyPath)
  // Test keys by using jwt
  let testToken = jwt.sign({ test: "test" }, privateKey, config.jwtOptions)
  jwt.verify(testToken, publicKey)
  config.log("Loaded RSA keypair.")
} catch(error) {
  if (privateKey || publicKey) {
    let errorName = error.name
    let errorCode = error.code
    if (errorName === "Error" && errorCode === "ENOENT") {
      config.error(`Error: Could not find key at path ${error.path}.`)
    } else if (errorName === "JsonWebTokenError") {
      config.error("Error: Testing provided keypair failed (could not verify a signed token).")
    } else {
      config.error(`Error: Unkown error when loading keypair. (${errorName}, ${errorCode}, ${error.message})`)
    }
    process.exit(1)
  }
  config.log(`Generating new keypair and saving to \`${privateKeyPath}\` and \`${publicKeyPath}\`...`)
  let key = new rsa({ b: 2048 })
  privateKey = key.exportKey("private")
  publicKey = key.exportKey("public")
  // Backup existing key files
  for (let filename of [privateKeyPath, publicKeyPath]) {
    let index = 0
    let file = (index) => filename + (index ? `.backup.${index}.key` : "")
    while (fs.existsSync(file(index))) {
      index += 1
    }
    if (index > 0) {
      config.warn(`Renaming ${file(0)} to ${file(index)}...`)
      fs.renameSync(file(0), file(index))
    }
  }
  // Save keys to files
  fs.writeFileSync(privateKeyPath, privateKey)
  fs.chmodSync(privateKeyPath, "600")
  fs.writeFileSync(publicKeyPath, publicKey)
  fs.chmodSync(publicKeyPath, "644")
}
config.privateKey = privateKey
config.publicKey = publicKey
config.key = new rsa(privateKey)

/**
 * ##### Providers Setup #####
 */

if (env != "test") {
  // Load providers
  const providersFile = process.env.PROVIDERS_PATH || "./providers.json"
  // If file doesn't exist, create it with an empty array
  if (!fs.existsSync(providersFile)) {
    fs.writeFileSync(providersFile, "[]")
  }
  try {
    config.providers = require(providersFile)
    if (!Array.isArray(config.providers)) {
      throw new Error("providers.json has to contain an array.")
    }
    config.providers = config.providers.filter(provider => !provider.disabled)
    if (!config.providers.length) {
      config.warn("Warning: No providers configured. Refer to the documentation on how to configure providers: https://github.com/gbv/login-server#providers")
    }
  } catch(error) {
    config.error(`Error: Missing or invalid providers.json at ${providersFile}; aborting startup. Please consult the documentation.`)
    process.exit(1)
  }
  // Prepare providers
  let imageFormats = ["svg", "png", "jpg"]
  for (let provider of config.providers) {
    provider.loginURL = `${baseUrl}login/${provider.id}`,
    provider.callbackURL = `${baseUrl}login/${provider.id}/return`
    // Add image URL if a file for that provider can be found
    if (!provider.image) {
      for (let format of imageFormats) {
        let file = `static/${provider.id}.${format}`
        if (fs.existsSync(file)) {
          provider.image = `${baseUrl}${file}`
          break
        }
      }
    } else if (!provider.image.startsWith("http")) {
      // If it's a relative URL, prepend the baseUrl
      provider.image = `${baseUrl}${provider.image}`
    }
    // Add default URL
    if (!provider.url) {
      switch (provider.strategy) {
        case "github":
          provider.url = "https://github.com"
          break
        case "orcid":
          provider.url = "https://orcid.org"
          break
        case "mediawiki":
          provider.url = "https://www.mediawiki.org/wiki/MediaWiki"
          break
        case "stackexchange":
          provider.url = "https://stackexchange.com"
          break
      }
    }
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
            displayName: "A Test User",
          },
        ],
      },
    },
  ]
}

// Add application names
try {
  config.applications = require("./applications.json")
} catch (error) {
  config.applications = []
}

config.log("Allowed origins:", allowedOrigins.join(", "))

// Show warning if there is no imprint/privacy URL
if (!urls.imprint) {
  config.warn("Warning: IMPRINT_URL is not configured.")
}
if (!urls.privacy) {
  config.warn("Warning: PRIVACY_URL is not configured.")
}

module.exports = config
