const _ = require("lodash")
const config = require("./config")
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


// Currently redirects to /login, but will offer a API documentation later.
app.get("/", (req, res) => {
  res.redirect("/login")
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
