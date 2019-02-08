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

describe("GET /account", () => {

  it("should return a 200 response if the user is logged in", (done) => {
    authAgent
      .get("/account")
      .expect(200, done)
  })

  it("should return a 302 response and redirect to /login if user is not logged in", (done) => {
    request(app)
      .get("/account")
      .expect("Location", "/login")
      .expect(302, done)
  })

})
