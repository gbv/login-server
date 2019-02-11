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
      ws.on("message", message => {
        let event = JSON.parse(message)
        if (event.type == "providers") {
          // End test when providers were received
          expect(event.data).to.be.an("object")
          expect(event.data.providers).to.be.an("array").with.length(1)
          done()
        } else {
          expect(event.type).to.be.equal("loggedOut")
        }
      })
      ws.on("open", () => {
        // WebSocket opened, send provider request
        ws.send(JSON.stringify({ type: "providers" }))
      })
    })
  })

})
