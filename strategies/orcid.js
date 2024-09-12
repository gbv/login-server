/**
 * OAuth Stategy for ORCID.
 */

import config from "../config.js"
import { Strategy } from "passport-orcid"

export default (options, provider, callback) => new Strategy(Object.assign(options, { sandbox: config.env !== "production" }), (req, token, tokenSecret, params, profile, done) => {
  // ORCID "profile" is empty, so use params to fill profile
  callback(req, token, tokenSecret, {
    id: params.orcid,
    name: params.name,
    username: null,
    provider: provider.id,
  }, done)
})
