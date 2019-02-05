const _ = require("lodash")
const config = require("./config")
const express = require("express")
const session = require("express-session")
const bodyParser = require("body-parser")
const fs = require("fs")
const passport = require("passport")
const path = require("path")
var MongoStore = require("connect-mongo")(session)
const User = require("./models/user")

// Don't start application without a port!
const port = config.port
if (!port) {
  console.error("Please provide PORT in .env")
  process.exit(1)
}

/**
 * Returns a random v4 UUID.
 *
 * from: https://gist.github.com/jed/982883
 */
function uuid(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,uuid)}

// Prepare strategies with they verify functions
const strategies = require("./strategies")((req, token, tokenSecret, profile, done) => {
  let user = req.user
  if (!user) {
    // User is not yet logged in. Either find existing user or create a new user.
    User.findOne({ [`identities.${profile.provider}.id`]: profile.id }).then(user => {
      if (user) {
        // Found existing user
        done(null, user)
      } else {
        // Create new user
        let id = uuid()
        user = new User({
          _id: id,
          uri: `${config.baseUrl}/users/${id}`,
          name: profile.name,
          identities: {
            [profile.provider]: profile
          }
        })
        user.save().then(user => {
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
    let identities = Object.assign(user.identities, { [profile.provider]: profile })
    user.set("identities", {})
    user.set("identities", identities)
    user.save().then(user => {
      return done(null, user)
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

// Pretty-print JSON output
app.set("json spaces", 2)

// Configure view engine to render EJS templates.
app.set("views", __dirname + "/views")
app.set("view engine", "ejs")

// Prepare sessions, etc.
app.use(bodyParser.urlencoded({ extended: true }))
app.use(require("cookie-parser")())
app.use(session({
  secret: config.sessionSecret,
  resave: true,
  saveUninitialized: false,
  // See: https://github.com/jdesboeufs/connect-mongo
  store: new MongoStore({ url: config.database.url }),
  cookie: {
    secure: config.env != "development",
    maxAge: 10*365*24*60*60*1000
  }
}))
app.use(passport.initialize())
app.use(passport.session())

// Strategy routes
_.forEach(strategies, (strategy, provider) => {
  app.get(`/login/${provider}`,
    passport.authenticate(provider))

  app.get(`/login/${provider}/return`,
    passport.authenticate(provider), (req, res) => {
      res.redirect("/")
    })
})

// Disconnect route
app.get("/disconnect/:provider", (req, res) => {
  let user = req.user
  let provider = req.params.provider
  if (user && user.identities && user.identities[provider]) {
    let identities = _.omit(user.identities, [provider])
    user.set("identities", {})
    user.set("identities", identities)
    // TODO: Error handling.
    user.save().catch(() => null).finally(() => {
      res.redirect("/")
    })
  } else {
    res.redirect("/")
  }
})

app.get("/logout", (req, res) => {
  // Invalidate session.
  req.logout()
  res.redirect("/")
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
