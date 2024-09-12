import config, { getDirname } from "./config.js"
const __dirname = getDirname(import.meta.url)

// Don't start application without a port!
let port = config.port
if (!port && config.env != "test") {
  config.error("Please provide PORT in .env")
  process.exit(1)
}

import _ from "lodash"
import * as utils from "./utils/index.js"
import * as events from "./lib/events.js"

/**
 * ##### Passport Setup #####
 */
import passport from "passport"
import User from "./models/user.js"
import { strategies } from "./strategies/index.js"

// Use strategies in passport
_.forEach(strategies, (strategy, id) => {
  passport.use(id, strategy)
})

// Serialize user by their id
passport.serializeUser((user, done) => {
  if (!user) {
    done(new Error("No user ID"))
  } else {
    done(null, user.id)
  }
})

// Deserialize user by retrieving their profile with the id.
passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user)
  }).catch(error => {
    done(error, null)
  })
})

/**
 * ##### Express Setup #####
 */
import express from "express"
export const app = express()

// Use helmet to set important http headers
import helmet from "helmet"
app.use(helmet({
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: config.ssl,
  crossOriginOpenerPolicy: { policy: config.ssl ? "same-origin-allow-popups" : "unsafe-none" },
}))

// Add Helmet's CSP headers dynamically in order to add script nonces
import crypto from "node:crypto"
app.use((req, res, next) => {
  function generateNonce() {
    return crypto.randomBytes(16).toString("base64")
  }
  res.locals.nonceFooter = generateNonce()
  res.locals.nonceTemp = generateNonce()

  // Adjusted from https://github.com/helmetjs/helmet/blob/d75632db7dece10210e3a1db1a36d6dec686697d/middlewares/content-security-policy/index.ts#L20-L32
  const directives = {
    "default-src": ["'self'", config.ssl ? "wss:" : "ws:"],
    "base-uri": ["'self'"],
    "block-all-mixed-content": [],
    "font-src": ["'self'", "https:", "data:"],
    "frame-ancestors": ["'self'"],
    "img-src": ["'self'", "data:", "https:", "http:"],
    "object-src": ["'none'"],
    "script-src": ["https://cdn.jsdelivr.net/npm/gbv-login-client@1/dist/gbv-login-client.js", "https://cdn.jsdelivr.net/gh/stefandesu/node-jsonwebtoken@master/build/jsonwebtoken.js", `'nonce-${res.locals.nonceFooter}'`, `'nonce-${res.locals.nonceTemp}'`],
    "script-src-attr": null, // will fall back to script-src
    "style-src": ["'self'", "https:", "'unsafe-inline'"],
    "upgrade-insecure-requests": config.ssl ? [] : null,
  }
  helmet.contentSecurityPolicy({
    directives,
  })(req, res, next)
})

// Rewrite res.redirect to always prepend baseUrl
app.use((req, res, next) => {
  let redirect = res.redirect
  res.redirect = target => {
    target = config.baseUrl + (target.startsWith("/") ? target.slice(1) : target)
    redirect.call(res, target)
  }
  next()
})

// Rewrite res.render to always attach user and flash messages
app.use((req, res, next) => {
  let render = res.render
  res.render = (view, options, callback) => {
    options = Object.assign({
      user: req.user,
      messages: utils.flashMessages(req),
      path: req.path,
      redirect: null,
    }, options || {})
    render.call(res, view, options, callback)
  }
  next()
})

// Add default headers
app.use((req, res, next) => {
  // Allow multiple origins from config
  let origin = req.headers.origin
  if (config.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  }
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE")
  res.setHeader("Access-Control-Allow-Credentials", true)
  res.setHeader("Access-Control-Expose-Headers", "X-Total-Count, Link")
  next()
})

// WebSockets
import expressWs from "express-ws"
expressWs(app)

// Flash messages
import flash from "connect-flash"
app.use(flash())

// BodyParser
import bodyParser from "body-parser"
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Add /about route before session/db handling
import aboutRoute from "./routes/about.js"
aboutRoute(app)

// Cookies/Sessions
import cookieParser from "cookie-parser"
app.use(cookieParser(config.sessionSecret))
// Trust proxy when not used locally
if (!config.isLocal) {
  app.set("trust proxy", 1)
}

const oldCookieName = "connect.sid"
// New cookie name based on hash of baseUrl (to prevent issues with special characters)
const baseUrlHash = crypto.createHash("sha256").update(config.baseUrl).digest("hex")
const newCookieName = `login-server-${baseUrlHash}`
// Rewrite cookie name for version 0.7.2
// We're keeping the old cookie just in case it's actually from a different application (even though it's very unlikely)
// TODO: Remove this later, in 1.0 at the latest
app.use((req, res, next) => {
  if (req.signedCookies[oldCookieName] && !req.signedCookies[newCookieName]) {
    res.cookie(newCookieName, req.signedCookies[oldCookieName], {
      sameSite: config.ssl ? "none" : "lax",
      secure: config.ssl,
      maxAge: config.cookieMaxDays * 24 * 60 * 60 * 1000,
      httpOnly: true,
      signed: true,
    })
  }
  next()
})

// Handle database failures
app.use((req, res, next) => {
  if (!utils.isConnectedToDatabase()) {
    // Catch requests and return an error
    const error = {
      error: "DatabaseAccessError",
      status: 500,
      message: "There was an error accessing the database. Please try again later.",
    }
    if (req.accepts("html")) {
      // Error page
      res.render("error", { error })
    } else {
      // Error as JSON
      res.status(500).json(error)
    }
  } else {
    next()
  }
})

import session from "express-session"
import mongoStore from "./utils/mongoStore.js"
app.use(session({
  name: newCookieName,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: mongoStore,
  cookie: {
    sameSite: config.ssl ? "none" : "lax",
    secure: config.ssl,
    maxAge: config.cookieMaxDays * 24 * 60 * 60 * 1000,
    httpOnly: true,
    signed: true,
  },
}))

// Remove Same-Site: None if browser is incompatible
import { shouldSendSameSiteNone } from "should-send-same-site-none"
app.use(shouldSendSameSiteNone)

// Passport
app.use(passport.initialize())
app.use(passport.session())

import util from "node:util"
app.use((req, res, next) => {
  // Promisify req.logout
  const logout = req.logout
  req.logOut =
  req.logout = util.promisify(logout).bind(req)

  // Watch for sessionID changes and update IDs for WebSockets if necessary
  const prevSessionID = req.sessionID
  res.once("finish", () => {
    if (prevSessionID !== req.sessionID) {
      events.updateSessionID(prevSessionID, req.sessionID)
    }
  })
  next()
})

// Update lastUsed property of logged in user
import Usage from "./models/usage.js"
app.use((req, res, next) => {
  if (req.user) {
    Usage.findById(req.user.id).then(usage => {
      if (!usage) {
        usage = new Usage({ _id: req.user.id })
        usage.created = (new Date()).toISOString()
      }
      usage.lastUsed = (new Date()).toISOString()
      usage.save().catch(() => null).then(() => next())
    })
  } else {
    next()
  }
})

// Pretty-print JSON output
app.set("json spaces", 2)

// Configure view engine to render EJS templates.
app.set("views", __dirname + "/views")
app.set("view engine", "ejs")

// Remove sensitive information from config and attach it to app.locals
let localConfig = _.cloneDeep(config)
localConfig.providers = utils.prepareProviders()
app.locals.baseUrl = localConfig.baseUrl
app.locals.config = localConfig

// Offer static files in `/static`
app.use("/static", express.static("static"))

/**
 * ##### Express Route Setup #####
 */

import fs from "node:fs"
import path from "node:path"

import portfinder from "portfinder"
const start = async () => {
  // Port is defined at the top of the file
  if (config.env == "test") {
    portfinder.basePort = port || 3000
    port = await portfinder.getPortPromise()
  }
  const listener = await new Promise(resolve => {
    let listener
    listener = app.listen(port, () => {
      config.log(`Listening on port ${port}.`)

      // Import routes
      fs.readdirSync(path.join(__dirname, "routes")).map(file => {
        import(`./routes/${file}`).then(route => route.default(app))
      })

      resolve(listener)
    })
  })

  return { app, listener, port }
}

export const server = start()
