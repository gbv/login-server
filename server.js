const config = require("./config")

// Don't start application without a port!
const port = config.port
if (!port && config.env != "test") {
  console.error("Please provide PORT in .env")
  process.exit(1)
}

const _ = require("lodash")

/**
 * ##### Passport Setup #####
 */
const passport = require("passport")
const User = require("./models/user")
const strategies = require("./strategies").strategies

// Use strategies in passport
_.forEach(strategies, (strategy) => {
  passport.use(strategy)
})

// Serialize user by their id
passport.serializeUser((user, done) => {
  done(null, user.id)
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
const express = require("express")
let app = express()

// Use helmet to set important http headers
app.use(require("helmet")())

// Rewrite res.redirect to always prepend baseUrl
app.use((req, res, next) => {
  let redirect = res.redirect
  res.redirect = target => {
    target = config.baseUrl + (target.startsWith("/") ? "" : "/") + target
    redirect.call(res, target)
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
require("express-ws")(app)

// Flash messages
app.use(require("connect-flash")())

// BodyParser
const bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Cookie parser
app.use(require("cookie-parser")())

// Sessions
const session = require("express-session")
const mongoStore = require("./utils/mongoStore")
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: mongoStore,
  cookie: {
    secure: config.env != "development" && config.env != "test",
    maxAge: 10*365*24*60*60*1000
  }
}))

// Passport
app.use(passport.initialize())
app.use(passport.session())

// Pretty-print JSON output
app.set("json spaces", 2)

// Configure view engine to render EJS templates.
app.set("views", __dirname + "/views")
app.set("view engine", "ejs")
app.locals.baseUrl = config.baseUrl
app.locals.config = config

// Offer static files in `/static`
app.use("/static", express.static("static"))

/**
 * ##### Express Route Setup #####
 */

// Currently redirects to /login, but will offer a API documentation later.
app.get("/", (req, res) => {
  res.redirect("/login")
})

const portfinder = require("portfinder")
const fs = require("fs")
const path = require("path")

let returnObject = {}
let promise = require("./utils/db").then(db => {
  returnObject.db = db
  // For tests, find the next empty port
  if (config.env == "test") {
    portfinder.basePort = port || 3000
    return portfinder.getPortPromise()
  } else {
    return port
  }
}).then(port => {
  return new Promise(resolve => {
    returnObject.port = port
    let listener = app.listen(port, () => {
      console.log(`Listening on port ${port}.`)

      // Import routes
      fs.readdirSync(path.join(__dirname, "routes")).map(file => {
        require("./routes/" + file)(app)
      })

      returnObject.app = app
      // Resolve promise
      resolve(returnObject)
    })
    returnObject.listener = listener
  })
})

module.exports = { app, server: promise }
