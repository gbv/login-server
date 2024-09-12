/**
 * Providers route.
 */

import * as utils from "../utils/index.js"

export default app => {

  app.get("/providers", (req, res) => {
    res.json(utils.prepareProviders())
  })

}
