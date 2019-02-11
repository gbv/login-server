const chai = require("chai")
const expect = chai.expect
const request = require("supertest")
const app = require("../server")

// Use this agent for authenticated requests
let authAgent = request.agent(app)

before((done) => {
  // Wait for the app to start
  app.on("started", () => {
    // Send a request to authenticate the user
    authAgent
      .post("/login/test")
      .send({
        username: "testuser",
        password: "testtest"
      })
      .end((error, response) => {
        expect(response.header["set-cookie"]).not.to.be.null
        expect(response.statusCode).to.equal(302)
        expect("Location", "/account")
        done()
      })
  })
})

module.exports = authAgent
