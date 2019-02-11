const request = require("supertest")
const { app } = require("../server")

// Use this agent for authenticated requests
let authAgent = require("./authAgent")

describe("GET /account", () => {

  it("should return a 200 response if the user is logged in", done => {
    authAgent
      .get("/account")
      .expect(200, done)
  })

  it("should return a 302 response and redirect to /login if user is not logged in", done => {
    request(app)
      .get("/account")
      .expect("Location", "/login")
      .expect(302, done)
  })

})
