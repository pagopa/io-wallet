import { Oauth2AuthorizationServer } from "@openid4vc/oauth2";
import { Openid4vciIssuer } from "@openid4vc/openid4vci";

import { makeJwksRepository } from "../adapters/in-memory/signer";
import {
  getSignJwtCallback,
  callbacks as partialCallbacks,
} from "../domain/util";
import { getConfigOrError } from "./config";

const config = getConfigOrError(process.env);
const jwksRepository = makeJwksRepository(config.signer.jwks);

const callbacks = {
  ...partialCallbacks,
  fetch,
  signJwt: getSignJwtCallback([jwksRepository.get().private]),
};
const authorizationServer = new Oauth2AuthorizationServer({ callbacks });
const openid4vciIssuer = new Openid4vciIssuer({ callbacks });

// Just for testing purposes
// eslint-disable-next-line no-console
console.log(authorizationServer);
// eslint-disable-next-line no-console
console.log(openid4vciIssuer);
