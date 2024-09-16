/**
 * /about route.
 */

import * as utils from "../utils/index.js"

export default app => {

  app.get("/about", async (req, res) => {
    res.json(await utils.prepareAbout())
  })

}
