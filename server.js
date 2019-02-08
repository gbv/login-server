const _ = require("lodash")
const config = require("./config")
const utils = require("./utils")
const express = require("express")
const session = require("express-session")
const helmet = require("helmet")
const bodyParser = require("body-parser")
const flash = require("connect-flash")
const fs = require("fs")
const passport = require("passport")
const path = require("path")
const User = require("./models/user")

// Prepare session store
const MongoStore = require("connect-mongo")(session)
const mongoStore = new MongoStore({ url: config.database.url })

// Prepare WebSocket events
const events = require("./lib/events")

// Don't start application without a port!
const port = config.port
if (!port) {
  console.error("Please provide PORT in .env")
  process.exit(1)
}

// Prepare strategies
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

let app = express()

// Use helmet to set important http headers
app.use(helmet())

require("express-ws")(app)

// Pretty-print JSON output
app.set("json spaces", 2)

// Configure view engine to render EJS templates.
app.set("views", __dirname + "/views")
app.set("view engine", "ejs")
app.locals.baseUrl = config.baseUrl
app.locals.config = config

app.use(flash())

// Prepare sessions, etc.
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(require("cookie-parser")())
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: mongoStore,
  cookie: {
    secure: config.env != "development",
    maxAge: 10*365*24*60*60*1000
  }
}))
app.use(passport.initialize())
app.use(passport.session())


// Disconnect route
app.get("/disconnect/:provider", (req, res) => {
  let user = req.user
  let provider = req.params.provider
  if (user && user.identities && user.identities[provider]) {
    if (user.identities.length < 2) {
      // Don't disconnect if it's the only provider left
      req.flash("error", "You can't disconnect your last connected account.")
      res.redirect("/login")
      return
    }
    let identities = _.omit(user.identities, [provider])
    user.set("identities", {})
    user.set("identities", identities)
    // TODO: Error handling.
    user.save().then(user => {
      // Fire updated event
      events.userUpdated(req.sessionID, user)
      req.flash("success", "Account disconnected.")
    }).catch(() => {
      req.flash("error", "Account could not be disconnected.")
    }).finally(() => {
      res.redirect("/login")
    })
  } else {
    if (user) {
      req.flash("warning", "You can't disconnect an account that is not connected.")
    } else {
      req.flash("error", "You need to be logged in to disconnect an account.")
    }
    res.redirect("/login")
  }
})

app.get("/logout", async (req, res) => {
  // Note: Note sure if `await` is even applicable here, or if `req.user = undefined` makes sense, but it seems to help with #3.
  // Invalidate session
  await req.logout()
  req.flash("success", "You were logged out.")
  // Fire loggedOut event
  events.userLoggedOut(req.sessionID, req.user)
  req.user = undefined
  res.redirect("/login")
})

// Currently redirects to /login, but will offer a API documentation later.
app.get("/", (req, res) => {
  res.redirect("/login")
})

app.get("/delete", (req, res) => {
  res.render("delete", {
    user: req.user,
    messages: utils.flashMessages(req),
  })
})

// We need to use POST here because DELETE can't be opened by the browser.
app.post("/delete", async (req, res) => {
  let user = req.user
  await req.logout()
  User.findByIdAndRemove(user.id).then(() => {
    // Fire loggedOut event
    events.userLoggedOut(req.sessionID)
    req.flash("success", "Your user account was deleted.")
  }).catch(() => {
    req.flash("error", "There was an error when trying to delete your user account.")
  }).finally(() => {
    req.user = undefined
    res.redirect("/login")
  })
})

app.ws("/", (ws, req) => {
  // Add sessionID to websockets
  const sessionID = req.sessionID
  events.addSocket(sessionID, ws)

  if (req.user) {
    // Fire loggedIn event
    events.userLoggedIn(sessionID, req.user)
  }
  ws.on("message", (message) => {
    try {
      message = JSON.parse(message)
      if (message.type === "providers") {
        // Reply with list of providers
        events.sendEvent(sessionID, "providers", {
          providers: utils.prepareProviders()
        })
      }
    } catch(error) {
      // Send error event to WebSocket
      events.error(sessionID, "Message could not be parsed.")
    }
  })
  ws.on("close", () => {
    // Remove sessionID from websockets
    events.removeSocket(sessionID)
  })
})

require("./utils/db").then(() => {
  app.listen(port, () => {
    console.log(`Listening on port ${port}.`)

    // Define routes
    fs.readdirSync(path.join(__dirname, "routes")).map(file => {
      require("./routes/" + file)(app)
    })
  })
})

module.exports = app
