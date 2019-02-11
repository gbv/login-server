const expect = require("chai").expect
const request = require("supertest")
const { app } = require("../server")

describe("GET /providers", () => {

  it("should return providers with sensitive information stripped out", done => {
    request(app)
      .get("/providers")
      .expect("Content-Type", /json/)
      .expect(res => {
        // In tests, there is always one test provider
        expect(res.body).to.be.an("array").of.length(1)
        expect(res.body[0]).to.not.have.property("options")
      })
      .expect(200, done)

  })

})
