const expect = require("chai").expect
const request = require("supertest")
const { app } = require("../server")
const utils = require("../utils")

// Use this agent for authenticated requests
let authAgent = require("./authAgent")

let currentUser

describe("GET /currentUser", () => {

  it("should return error 401 when not logged in", done => {
    request(app)
      .get("/currentUser")
      .expect(401, done)

  })

  it("should return user object when logged in", done => {
    authAgent
      .get("/currentUser")
      .expect("Content-Type", /json/)
      .expect(res => {
        expect(res.body).to.be.an("object")
        currentUser = res.body
        expect(res.body.uri).to.be.a("string")
        expect(res.body.name).to.be.a("string")
        expect(res.body.identities).to.be.an("object")
        expect(res.body.identities.test).to.be.an("object")
      })
      .expect(200, done)
  })

})

describe("GET /users", () => {

  it("should return a list of users", done => {
    request(app)
      .get("/users")
      .expect("Content-Type", /json/)
      .expect(res => {
        expect(res.body).to.be.an("array")
        expect(res.body[0]).to.be.an("object")
      })
      .expect(200, done)
  })

})

describe("GET /users/:id", () => {

  it("should return the current user", done => {
    request(app)
      .get(currentUser.uri.substring(currentUser.uri.indexOf("/users")))
      .expect("Content-Type", /json/)
      .expect(res => {
        expect(res.body).to.be.an("object")
        expect(res.body).to.deep.equal(currentUser)
      })
      .expect(200, done)
  })

})

describe("PATCH /users/:id", () => {

  it("should deny request if user is not logged in", done => {
    request(app)
      .patch(currentUser.uri.substring(currentUser.uri.indexOf("/users")))
      .send({ name: "hello" })
      .expect(401, done)
  })

  it ("should return a 422 response if there is no patch", done => {
    authAgent
      .patch(currentUser.uri.substring(currentUser.uri.indexOf("/users")))
      .send({})
      .expect(422, done)
  })

  it ("should change name", done => {
    const patch = { name: utils.uuid() }
    authAgent
      .patch(currentUser.uri.substring(currentUser.uri.indexOf("/users")))
      .send(patch)
      .expect("Content-Type", /json/)
      .expect(res => {
        expect(res.body).to.be.an("object")
        let adjustedUser = Object.assign({}, currentUser, patch)
        expect(res.body).to.deep.equal(adjustedUser)
      })
      .expect(200, done)
  })

})
