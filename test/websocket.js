const expect = require("chai").expect
const { server } = require("../server")
const WebSocket = require("ws")
const _ = require("lodash")

// Use this agent for authenticated requests
let authAgent = require("./authAgent")

describe("WebSocket", () => {

  it("should connect to the WebSocket and receive messages as expected", done => {

    // Wait for the server
    server.then(({ listener, port }) => {

      // Get a token to authenticate later
      authAgent.get("/token").then(res => {
        expect(res.body).to.be.an("object")
        expect(res.body.token).to.be.a("string")
        const token = res.body.token

        // Connect to the WebSocket
        expect(port).to.be.equal(listener.address().port)
        let address = `ws://localhost:${port}/`
        let ws = new WebSocket(address)

        // Assemble expected response types
        const expected1 = ["loggedOut", "providers", "publicKey"].sort()
        const expected2 = ["loggedOut", "providers", "publicKey", "authenticated", "loggedIn", "token"].sort()

        // Message handler
        let responses = []
        ws.on("message", message => {
          let event = JSON.parse(message)
          responses.push(event.type)
          responses.sort()

          if (event.type == "providers") {
            expect(event.data).to.be.an("object")
            expect(event.data.providers).to.be.an("array").with.length(1)
          } else if (event.type == "token") {
            expect(event.data).to.be.an("object")
            expect(event.data.token).to.be.a("string")
          } else if (event.type == "loggedIn") {
            expect(event.data).to.be.an("object")
            expect(event.data.user).to.be.an("object")
          } else if (event.type == "publicKey") {
            expect(event.data).to.be.an("object")
            expect(event.data.publicKey).to.be.a("string")
            expect(event.data.algorithm).to.be.a("string")
          } else {
            expect(["loggedOut", "authenticated"]).to.contain(event.type)
          }
          // After "providers" and "loggedOut", send "authenticate" request with token
          if (responses.length == expected1.length) {
            expect(_.isEqual(expected1, responses)).to.be.true
            ws.send(JSON.stringify({ type: "authenticate", token }))
          }
          // Finish test when all expected responses were received
          if (expected2.length == responses.length) {
            expect(_.isEqual(expected2, responses)).to.be.true
            done()
          }
        })

        // Send "providers" and "publicKey" request after WebSocket opened
        ws.on("open", () => {
          ws.send(JSON.stringify({ type: "providers" }))
          ws.send(JSON.stringify({ type: "publicKey" }))
        })

      })
    })

  })

})
