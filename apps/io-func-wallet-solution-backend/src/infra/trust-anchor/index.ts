import { pipe, flow } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as jose from "jose";

import { agent } from "@pagopa/ts-commons";
import {
  AbortableFetch,
  setFetchTimeout,
  toFetch,
} from "@pagopa/ts-commons/lib/fetch";
import { Millisecond } from "@pagopa/ts-commons/lib/units";

import {
  EntityStatementHeader,
  EntityStatementPayload,
  TrustAnchor,
  TrustAnchorEntityConfigurationPayload,
} from "../../trust-anchor";
import { FederationEntityMetadata } from "../../entity-configuration";
import { validate } from "../../validation";
import { getKeyByKid } from "../../jwk";
import { verifyJwtSignature } from "../../verifier";

export class EidasTrustAnchor implements TrustAnchor {
  #configuration: FederationEntityMetadata;

  httpApiFetch = agent.getHttpFetch(process.env);
  abortableFetch = AbortableFetch(this.httpApiFetch);
  fetchWithTimeout = toFetch(
    setFetchTimeout(1000 as Millisecond, this.abortableFetch)
  ) as unknown as typeof fetch;

  constructor(cnf: FederationEntityMetadata) {
    this.#configuration = cnf;
  }

  getPublicKeys = () => {
    const metadataUrl = new URL(
      "/.well-known/openid-federation",
      this.#configuration.trustAnchorUri.href
    );
    return pipe(
      metadataUrl.href,
      getRequest(this.fetchWithTimeout),
      TE.map(jose.decodeJwt),
      TE.chainEitherKW(
        validate(
          TrustAnchorEntityConfigurationPayload,
          "Invalid trust anchor entity configuration"
        )
      ),
      TE.map((metadata) => metadata.jwks.keys)
    );
  };

  getEntityStatement = () => {
    const fetchUrl = new URL("fetch", this.#configuration.trustAnchorUri.href);
    fetchUrl.searchParams.append("sub", this.#configuration.basePath.href);
    fetchUrl.searchParams.append(
      "anchor",
      this.#configuration.trustAnchorUri.href
    );

    return pipe(
      fetchUrl.href,
      getRequest(this.fetchWithTimeout),
      TE.chain(this.validateEntityStatementJwt)
    );
  };

  validateEntityStatementJwt = (jwt: string) =>
    pipe(
      jwt,
      jose.decodeProtectedHeader,
      validate(
        EntityStatementHeader,
        "Invalid trust anchor entity statement header"
      ),
      TE.fromEither,
      TE.chain((es) =>
        pipe(
          this.getPublicKeys(),
          TE.chain(
            flow(
              getKeyByKid(es.kid),
              TE.fromOption(() => new Error("Kid not found"))
            )
          )
        )
      ),
      TE.chain(verifyJwtSignature(jwt)),
      TE.map((decoded) => decoded.payload),
      TE.chainEitherKW(
        validate(
          EntityStatementPayload,
          "Invalid trust anchor entity statement payload"
        )
      )
    );
}

const getRequest = (fetchFunction: typeof fetch) => (url: string) =>
  pipe(
    TE.tryCatch(() => fetchFunction(url), E.toError),
    TE.chain((response) =>
      response.status === 200
        ? TE.tryCatch(() => response.text(), E.toError)
        : TE.left(
            new Error(`Invalid response from trust anchor: ${response.status}`)
          )
    )
  );