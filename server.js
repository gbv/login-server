const config = require("./config")

// Don't start application without a port!
const port = config.port
if (!port) {
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
let app = require("express")()

// Use helmet to set important http headers
app.use(require("helmet")())

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
const MongoStore = require("connect-mongo")(session)
const mongoStore = new MongoStore({ url: config.database.url })
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

require("./utils/db").then(() => {
  // For tests, find the next empty port
  if (config.env == "test") {
    portfinder.basePort = port
    return portfinder.getPortPromise()
  } else {
    return port
  }
}).then(port => {
  app.listen(port, () => {
    console.log(`Listening on port ${port}.`)

    // Import routes
    fs.readdirSync(path.join(__dirname, "routes")).map(file => {
      require("./routes/" + file)(app)
    })

    // Emit event that tests can use to wait for
    app.emit("started")
  })
})

module.exports = app
