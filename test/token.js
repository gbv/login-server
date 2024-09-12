import { expect } from "chai"
import request from "supertest"
import { app } from "../server.js"
import jwt from "jsonwebtoken"

// Use this agent for authenticated requests
import authAgent from "./authAgent.js"

let publicKey

describe("GET /about", () => {

  it("should return information (e.g. public key)", done => {
    request(app)
      .get("/about")
      .expect(res => {
        expect(res.body).to.be.an("object")
        expect(res.body.publicKey).to.be.a("string")
        publicKey = res.body.publicKey
        expect(res.body.algorithm).to.be.a("string")
        expect(res.body.title).to.be.a("string")
        expect(res.body.env).to.be.a("string")
      })
      .expect(200, done)

  })

})

describe("GET /token", () => {

  it ("should return a valid token with user: null if user is not logged in", done => {
    request(app)
      .get("/token")
      .expect("Content-Type", /json/)
      .expect(res => {
        expect(res.body).to.be.an("object")
        expect(res.body.token).to.be.a("string")
        expect(res.body.expiresIn).to.be.a("number")
        // Check token for validity
        let token = jwt.verify(res.body.token, publicKey)
        expect(token.user).to.be.null
      })
      .expect(200, done)
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
        let token = jwt.verify(res.body.token, publicKey)
        expect(token.user).to.be.an("object")
        expect(token.sessionID).to.be.a("string")
      })
      .expect(200, done)
  })

})
