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

// Prepare rate limiting middleware
const rateLimit = require("express-rate-limit")
const apiLimiter = rateLimit({
  // Maximum of 10 requests per minute
  windowMs: 60 * 1000,
  max: 10
})

// Prepare session store
const MongoStore = require("connect-mongo")(session)
const mongoStore = new MongoStore({ url: config.database.url })

// List of websockets by session ID
let websockets = {}

// Helper method for sending socket messages about session events
function sendEvent(sessionID, event, data) {
  let socket = websockets[sessionID]
  if (socket) {
    socket.send(JSON.stringify({
      type: event,
      date: (new Date()).toISOString(),
      data
    }))
  }
}
// Event methods for session changes
function userLoggedIn(user, sessionID) {
  sendEvent(sessionID, "loggedIn", { user })
}
function userLoggedOut(user, sessionID) {
  sendEvent(sessionID, "loggedOut", { user })
}
function userUpdated(user, sessionID) {
  sendEvent(sessionID, "updated", { user })
}

// Don't start application without a port!
const port = config.port
if (!port) {
  console.error("Please provide PORT in .env")
  process.exit(1)
}

// Prepare strategies with they verify functions
const strategies = require("./strategies")((req, token, tokenSecret, profile, done) => {
  let user = req.user
  const sessionID = req.sessionID
  let provider = config.providers.find(provider => provider.id === profile.provider)
  if (!user) {
    // User is not yet logged in. Either find existing user or create a new user.
    User.findOne({ [`identities.${profile.provider}.id`]: profile.id }).then(user => {
      if (user) {
        // Found existing user
        // Fire loggedIn event
        userLoggedIn(user, sessionID)
        req.flash("success", "You were logged in.")
        done(null, user)
      } else {
        // Create new user
        let id = utils.uuid()
        user = new User({
          _id: id,
          uri: `${config.baseUrl}/users/${id}`,
          name: profile.name,
          identities: {
            [profile.provider]: _.omit(profile, ["provider"])
          }
        })
        user.save().then(user => {
          // Fire loggedIn event
          userLoggedIn(user, sessionID)
          req.flash("success", "A new user account was successfully created!")
          done(null, user)
        }).catch(error => {
          done(error, null)
        })
      }
    }).catch(error => {
      done(error, null)
    })
  } else {
    // User is already logged in. Add new profile to identities.
    // Note: This is a workaround to make Mongoose recognize the changes.
    let identities = Object.assign(user.identities, { [profile.provider]: _.omit(profile, ["provider"]) })
    user.set("identities", {})
    user.set("identities", identities)
    user.save().then(user => {
      userUpdated(user, sessionID)
      req.flash("success", `${provider && provider.name} successfully connected.`)
      done(null, user)
    }).catch(error => {
      done(error, null)
    })
  }
})

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

// Strategy routes
_.forEach(strategies, (strategy, providerId) => {

  let provider = config.providers.find(provider => provider.id === providerId)
  if (!provider) {
    return
  }
  let strategyName = provider.strategy

  let skip = (req, res, next) => {
    if (req.user && req.user.identities && req.user.identities[providerId]) {
      // User has already connected this account
      req.flash("info", `${provider.name} is already connected.`)
      res.redirect("/login")
    } else {
      next()
    }
  }

  let authenticateOptions = {
    successRedirect: "/login",
    failureRedirect: `/login/${providerId}`,
    failureFlash: "Could not verify credentials."
  }

  if (provider.credentialsNecessary) {
    // Add a GET and POST route

    app.get(`/login/${providerId}`, skip, (req, res) => {
      res.render("login", {
        provider,
        user: req.user,
        messages: utils.flashMessages(req),
      })
    })

    app.post(`/login/${providerId}`,
      apiLimiter,
      passport.authenticate(strategyName, authenticateOptions))

  } else {
    // Add GET routes for login redirection and return

    app.get(`/login/${providerId}`, skip,
      passport.authenticate(strategyName))

    app.get(`/login/${providerId}/return`,
      passport.authenticate(strategyName, authenticateOptions))

  }
})

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
      userUpdated(user, req.sessionID)
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
  userLoggedOut(req.user, req.sessionID)
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
    userLoggedOut(null, req.sessionID)
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
  websockets[sessionID] = ws
  if (req.user) {
    // Fire loggedIn event
    userLoggedIn(req.user, sessionID)
  }
  ws.on("message", (message) => {
    try {
      message = JSON.parse(message)
      if (message.type === "providers") {
        // Reply with list of providers
        sendEvent(sessionID, "providers", {
          providers: utils.prepareProviders()
        })
      }
    } catch(error) {
      // Send error event to WebSocket
      sendEvent(sessionID, "error", { message: "Message could not be parsed." })
    }
  })
  ws.on("close", () => {
    // Remove sessionID from websockets
    websockets[sessionID] = undefined
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
