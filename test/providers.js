import { expect } from "chai"
import request from "supertest"
import { app } from "../server.js"

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
