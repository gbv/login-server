import { expect } from "chai"
import request from "supertest"
import { app } from "../server.js"

// Use this agent for authenticated requests
import authAgent from "./authAgent.js"

describe("GET /account", () => {

  it("should return a 200 response if the user is logged in", done => {
    authAgent
      .get("/account")
      .expect(200, done)
  })

  it("should return a 302 response and redirect to /login if user is not logged in", done => {
    request(app)
      .get("/account")
      .expect(res => {
        expect(res.header.location.endsWith("/login")).to.be.true
      })
      .expect(302, done)
  })

})
