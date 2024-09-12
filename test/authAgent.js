import { expect } from "chai"
import request from "supertest"
import { server, app } from "../server.js"
import User from "../models/user.js"

// Use this agent for authenticated requests
let authAgent = request.agent(app)

before(done => {
  // Wait for the app to start
  server.then(() => {
    User.deleteMany({}).then(() => {
      // Send a request to authenticate the user
      authAgent
        .post("/login/test")
        .send({
          username: "testuser",
          password: "testtest",
        })
        .expect(res => {
          expect(res.header["set-cookie"]).not.to.be.null
          // Do not use the default cookie name
          expect(res.header["set-cookie"][0].startsWith("connect.sid=")).to.be.false
          expect(res.header.location.endsWith("/account")).to.be.true
        })
        .expect(302, done)
    })
  })
})

after(() => {
  // Remove all users after test
  return User.deleteMany({})
})

export default authAgent
