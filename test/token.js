const expect = require("chai").expect
const request = require("supertest")
const { app } = require("../server")
const jwt = require("jsonwebtoken")

// Use this agent for authenticated requests
let authAgent = require("./authAgent")

let publicKey

describe("GET /publicKey", () => {

  it("should return the public key", done => {
    request(app)
      .get("/publicKey")
      .expect(res => {
        expect(res.body).to.be.an("object")
        expect(res.body.publicKey).to.be.a("string")
        publicKey = res.body.publicKey
        expect(res.body.algorithm).to.be.a("string")
      })
      .expect(200, done)

  })

})

describe("GET /token", () => {

  it("should deny token if user is not logged in", done => {
    request(app)
      .get("/token")
      .expect(401, done)
  })

  it ("should return a valid token if user is logged in", done => {
    authAgent
      .get("/token")
      .expect("Content-Type", /json/)
      .expect(res => {
        expect(res.body).to.be.an("object")
        expect(res.body.token).to.be.a("string")
        expect(res.body.expiresIn).to.be.a("number")
        // Check token for validity
        jwt.verify(res.body.token, publicKey)
      })
      .expect(200, done)
  })

})
