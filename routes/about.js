/**
 * /about route.
 */

import * as utils from "../utils/index.js"

export default app => {

  app.get("/about", (req, res) => {
    res.json(utils.prepareAbout())
  })

}
