const expect = require("chai").expect
const { server } = require("../server")
const WebSocket = require("ws")

describe("WebSocket", () => {

  it("should connect to the WebSocket, receive a loggedOut event and react to the providers request", done => {
    // Because this dooes not share the session with the authorized user agent, the user will be logged out.
    // TODO: Find way to test WebSocket with authorization
    server.then(({ listener, port }) => {
      expect(port).to.be.equal(listener.address().port)
      let address = `ws://localhost:${port}/`
      let ws = new WebSocket(address)
      let responses = 0, expected = 2
      ws.on("message", message => {
        responses += 1
        let event = JSON.parse(message)
        if (event.type == "providers") {
          // End test when providers were received
          expect(event.data).to.be.an("object")
          expect(event.data.providers).to.be.an("array").with.length(1)
        } else if (event.type == "tokens") {
          // TODO: Add as soon as WebSockets can be tested with authorization.
        } else {
          expect(event.type).to.be.equal("loggedOut")
        }
        if (responses == expected) {
          done()
        }
      })
      ws.on("open", () => {
        // WebSocket opened, send provider request
        ws.send(JSON.stringify({ type: "providers" }))
      })
    })
  })

})
