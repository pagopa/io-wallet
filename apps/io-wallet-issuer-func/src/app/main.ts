import { makeJwksRepository } from "../adapters/in-memory/signer";
import { getConfigOrError } from "./config";
import { Oauth2AuthorizationServer } from "@openid4vc/oauth2";
import {
  getSignJwtCallback,
  callbacks as partialCallbacks,
} from "../domain/util";
import { Openid4vciIssuer } from "@openid4vc/openid4vci";

const config = getConfigOrError(process.env);
const jwksRepository = makeJwksRepository(config.signer.jwks);

const callbacks = {
  ...partialCallbacks,
  fetch,
  signJwt: getSignJwtCallback([jwksRepository.get().private]),
};
const authorizationServer = new Oauth2AuthorizationServer({ callbacks });
const openid4vciIssuer = new Openid4vciIssuer({ callbacks });
